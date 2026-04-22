import type {
  OpsAssignRequest,
  OpsAssignmentOwnerOption,
  OpsAssignmentStatus,
  OpsCustomerContext,
  OpsCurrentAssignment,
  OpsInterventionHistory,
  OpsInterventionSummary,
  OpsLifecycleTransitionOption,
  OpsQueueItem,
  OpsQueueResponse,
  OpsQueueState,
  OpsQueueSummary,
  OpsRequestDetailAnswer,
  OpsRequestDetailCurrentState,
  OpsRequestDetailHistoryEntry,
  OpsRequestDetailResponse,
  OpsRequestServiceabilitySummary,
  OpsUpdateRequestStatus,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import { ObservabilityService } from '../../common/observability/observability.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import type {
  PersistedRequestAssignment,
  PersistedRequestHistoryEntry,
  PersistedRequestInterventionKind,
  PersistedServiceRequest,
  RequestLifecycleState,
} from '../requests/request-store.service';
import { RequestStoreService } from '../requests/request-store.service';
import {
  getAllowedOpsStatusTransitions,
  validateLifecycleTransition,
} from '../requests/domain/request-state-machine';
import {
  getRequestInterventionKindForLifecycle,
  getRequestLifecyclePresentation,
} from '../requests/domain/request-lifecycle-metadata';
import { resolveTransitionPublicRequestStatusPresentation } from '../requests/request-status.presenter';

type QueuePresentation = {
  queueState: OpsQueueState;
  queueStateLabel: string;
  queueStateDetail: string;
  urgencyCue: string;
  assignmentStatus: OpsAssignmentStatus;
  assignmentStatusLabel: string;
  priority: number;
};

type AssignmentEligibility = {
  canAssign: boolean;
  assignmentBlockedReason: string | null;
};

type InterventionPresentation = {
  label: string;
  detail: string;
  recommendedAction: string;
};

type AssignRequestInput = OpsAssignRequest & {
  actorId: string;
};

type UpdateRequestStatusInput = OpsUpdateRequestStatus & {
  actorId: string;
};

const AVAILABLE_ASSIGNMENT_OWNERS: OpsAssignmentOwnerOption[] = [
  {
    ownerType: 'provider',
    ownerTypeLabel: 'Provider',
    ownerId: 'provider_northstar',
    ownerLabel: 'Northstar Plumbing Co.',
    description: 'Primary plumbing partner for central neighborhoods.',
  },
  {
    ownerType: 'provider',
    ownerTypeLabel: 'Provider',
    ownerId: 'provider_riverside',
    ownerLabel: 'Riverside Home Services',
    description:
      'Secondary plumbing partner for overflow or west-side coverage.',
  },
  {
    ownerType: 'internalOwner',
    ownerTypeLabel: 'Internal owner',
    ownerId: 'internal_dispatch_desk',
    ownerLabel: 'Handrix Dispatch Desk',
    description:
      'Internal fallback owner for manual coordination and follow-through.',
  },
];

export class OpsAssignmentError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly recoveryHint: string,
    readonly status: 'badRequest' | 'notFound' = 'badRequest',
  ) {
    super(message);
    this.name = 'OpsAssignmentError';
  }
}

export class OpsStatusUpdateError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly recoveryHint: string,
    readonly status: 'badRequest' | 'notFound' = 'badRequest',
  ) {
    super(message);
    this.name = 'OpsStatusUpdateError';
  }
}

function getLatestHistoryEntry(
  request: PersistedServiceRequest,
): PersistedRequestHistoryEntry {
  return request.history[request.history.length - 1];
}

function formatAnswerValue(
  value: PersistedServiceRequest['answers'][number]['value'],
) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return value;
}

function getLifecycleStatePresentation(
  lifecycleState: RequestLifecycleState,
): Pick<
  OpsRequestDetailCurrentState,
  'lifecycleStateLabel' | 'lifecycleStateDetail'
> {
  const presentation = getRequestLifecyclePresentation(lifecycleState);

  return {
    lifecycleStateLabel: presentation.label,
    lifecycleStateDetail: presentation.detail,
  };
}

function formatAddressSummary(request: PersistedServiceRequest) {
  const unitOrAccessNote = (
    request.serviceLocation.unitOrAccessNote ?? ''
  ).trim();
  const locationPieces = [
    request.serviceLocation.addressLine1.trim(),
    request.serviceLocation.city.trim(),
  ].filter(Boolean);

  if (!unitOrAccessNote) {
    return locationPieces.join(', ');
  }

  return `${locationPieces.join(', ')} • ${unitOrAccessNote}`;
}

function getCurrentInterventionKind(
  lifecycleState: RequestLifecycleState,
): PersistedRequestInterventionKind | null {
  return getRequestInterventionKindForLifecycle(lifecycleState);
}

function getInterventionPresentation(
  kind: PersistedRequestInterventionKind,
): InterventionPresentation {
  switch (kind) {
    case 'clarification':
      return {
        label: 'Clarification needed',
        detail:
          'The request is waiting on one more customer or operational detail before fulfillment can continue.',
        recommendedAction:
          'Confirm the missing detail, then return the request to review or resume dispatch.',
      };
    case 'blocker':
      return {
        label: 'Operational blocker',
        detail:
          'An active fulfillment path exists, but a blocker or delay needs hands-on intervention.',
        recommendedAction:
          'Work the blocker, then resume dispatch or move the request to unavailable if the path cannot recover.',
      };
    case 'unavailable':
      return {
        label: 'Unavailable outcome',
        detail:
          'The current fulfillment path cannot continue and the fallback explanation needs to stay visible.',
        recommendedAction:
          'Confirm the fallback path and preserve a clear explanation for future support follow-up.',
      };
  }
}

function getQueuePresentation(
  lifecycleState: RequestLifecycleState,
  currentPublicStatus: PersistedServiceRequest['publicStatus'],
): QueuePresentation | null {
  switch (lifecycleState) {
    case 'awaiting_confirmation':
      return null;
    case 'intake_in_review':
      if (currentPublicStatus === 'received') {
        return {
          queueState: 'new',
          queueStateLabel: 'New request',
          queueStateDetail: 'Needs first-pass operations review.',
          urgencyCue: 'New intake',
          assignmentStatus: 'unassigned',
          assignmentStatusLabel: 'Unassigned',
          priority: 0,
        };
      }

      return {
        queueState: 'assignable',
        queueStateLabel: 'Ready for assignment',
        queueStateDetail:
          'Review is complete enough to choose a fulfillment path.',
        urgencyCue: 'Ready to assign',
        assignmentStatus: 'unassigned',
        assignmentStatusLabel: 'Unassigned',
        priority: 2,
      };
    case 'clarification_needed':
      return {
        queueState: 'needsClarification',
        queueStateLabel: 'Needs clarification',
        queueStateDetail:
          'Follow-up details are required before dispatch can proceed.',
        urgencyCue: 'Needs follow-up',
        assignmentStatus: 'waitingForClarification',
        assignmentStatusLabel: 'Waiting for clarification',
        priority: 1,
      };
    case 'dispatch_delayed':
      return {
        queueState: 'blocked',
        queueStateLabel: 'Blocked',
        queueStateDetail:
          'The request is active, but an operational blocker needs attention.',
        urgencyCue: 'Intervention needed',
        assignmentStatus: 'blocked',
        assignmentStatusLabel: 'Blocked',
        priority: 3,
      };
    case 'dispatch_in_progress':
      return {
        queueState: 'assigned',
        queueStateLabel: 'Dispatch in progress',
        queueStateDetail:
          'Fulfillment is moving forward and should stay visible in the queue.',
        urgencyCue: 'In motion',
        assignmentStatus: 'dispatchInProgress',
        assignmentStatusLabel: 'Dispatch in progress',
        priority: 4,
      };
    case 'unfulfilled':
      return {
        queueState: 'unavailable',
        queueStateLabel: 'Unavailable',
        queueStateDetail:
          'No current fulfillment path is available for this request.',
        urgencyCue: 'Unavailable',
        assignmentStatus: 'unavailable',
        assignmentStatusLabel: 'No assignment possible',
        priority: 5,
      };
    case 'completed':
      return null;
  }
}

function getDispatchReadiness(
  lifecycleState: RequestLifecycleState,
): Pick<
  OpsRequestServiceabilitySummary,
  'dispatchReadiness' | 'dispatchReadinessLabel' | 'dispatchReadinessDetail'
> {
  switch (lifecycleState) {
    case 'awaiting_confirmation':
      return {
        dispatchReadiness: 'readyForReview',
        dispatchReadinessLabel: 'Awaiting review',
        dispatchReadinessDetail:
          'Confirmation has not completed, so dispatch cannot begin yet.',
      };
    case 'intake_in_review':
      return {
        dispatchReadiness: 'readyForAssignment',
        dispatchReadinessLabel: 'Reviewing for assignment',
        dispatchReadinessDetail:
          'The request is active and being reviewed for the next dispatch decision.',
      };
    case 'clarification_needed':
      return {
        dispatchReadiness: 'needsClarification',
        dispatchReadinessLabel: 'Needs clarification',
        dispatchReadinessDetail:
          'More customer detail is required before assignment can proceed.',
      };
    case 'dispatch_delayed':
      return {
        dispatchReadiness: 'blocked',
        dispatchReadinessLabel: 'Blocked',
        dispatchReadinessDetail:
          'The request is active, but a delay or blocker needs operational attention.',
      };
    case 'dispatch_in_progress':
      return {
        dispatchReadiness: 'dispatchInProgress',
        dispatchReadinessLabel: 'Dispatch in progress',
        dispatchReadinessDetail:
          'A fulfillment path is already active and should stay aligned with customer updates.',
      };
    case 'unfulfilled':
      return {
        dispatchReadiness: 'unavailable',
        dispatchReadinessLabel: 'Unavailable',
        dispatchReadinessDetail:
          'The request is not currently serviceable through the active fulfillment model.',
      };
    case 'completed':
      return {
        dispatchReadiness: 'completed',
        dispatchReadinessLabel: 'Completed',
        dispatchReadinessDetail:
          'The request no longer requires dispatch action.',
      };
  }
}

function getServiceabilityLabel(
  serviceabilityStatus: PersistedServiceRequest['classification']['serviceabilityStatus'],
) {
  switch (serviceabilityStatus) {
    case 'serviceable':
      return 'Serviceable';
    case 'outOfArea':
      return 'Out of area';
    case 'needsRecovery':
      return 'Needs recovery';
  }
}

function toCurrentAssignment(
  assignment: PersistedRequestAssignment | undefined,
): OpsCurrentAssignment | null {
  if (!assignment) {
    return null;
  }

  return {
    ownerType: assignment.ownerType,
    ownerTypeLabel:
      assignment.ownerType === 'provider' ? 'Provider' : 'Internal owner',
    ownerId: assignment.ownerId,
    ownerLabel: assignment.ownerLabel,
    assignedAt: assignment.assignedAt,
    ...(assignment.note ? { note: assignment.note } : {}),
  };
}

function getLatestRelevantInterventionEntry(
  request: PersistedServiceRequest,
  kind: PersistedRequestInterventionKind,
) {
  return [...request.history]
    .reverse()
    .find((entry) => entry.intervention?.kind === kind);
}

function buildInterventionSummary(
  request: PersistedServiceRequest,
): OpsInterventionSummary | null {
  const kind = getCurrentInterventionKind(request.lifecycleState);

  if (kind === null) {
    return null;
  }

  const presentation = getInterventionPresentation(kind);
  const latestRelevantEntry = getLatestRelevantInterventionEntry(request, kind);

  return {
    kind,
    label: presentation.label,
    detail: latestRelevantEntry?.changeSummary ?? presentation.detail,
    recommendedAction: presentation.recommendedAction,
    customerImpact:
      latestRelevantEntry?.customerSnapshot.nextStepDetail ??
      presentation.detail,
    latestRelevantChange: latestRelevantEntry
      ? {
          occurredAt: latestRelevantEntry.occurredAt,
          actorType: latestRelevantEntry.actorType,
          changeSummary: latestRelevantEntry.changeSummary,
        }
      : null,
  };
}

function toHistoryIntervention(
  entry: PersistedRequestHistoryEntry,
): OpsInterventionHistory | null {
  if (!entry.intervention) {
    return null;
  }

  const presentation = getInterventionPresentation(entry.intervention.kind);

  return {
    kind: entry.intervention.kind,
    label: presentation.label,
    detail: entry.changeSummary,
  };
}

function getAssignmentEligibility(
  request: PersistedServiceRequest,
): AssignmentEligibility {
  const transitionValidation = validateLifecycleTransition({
    currentLifecycleState: request.lifecycleState,
    currentPublicStatus: request.publicStatus,
    nextLifecycleState: 'dispatch_in_progress',
    hasAssignment: request.assignment !== undefined,
    source: 'ops-assignment',
  });

  if (request.assignment) {
    return {
      canAssign: false,
      assignmentBlockedReason:
        'This request already has an active fulfillment owner.',
    };
  }

  if (!transitionValidation.isAllowed) {
    return {
      canAssign: false,
      assignmentBlockedReason: transitionValidation.reason,
    };
  }

  return {
    canAssign: true,
    assignmentBlockedReason: null,
  };
}

function toOpsQueueItem(
  request: PersistedServiceRequest,
): (OpsQueueItem & { priority: number }) | null {
  const presentation = getQueuePresentation(
    request.lifecycleState,
    request.publicStatus,
  );

  if (presentation === null) {
    return null;
  }

  const latestHistoryEntry = getLatestHistoryEntry(request);

  return {
    publicId: request.publicId,
    issueLabel: request.issueLabel,
    addressSummary: formatAddressSummary(request),
    queueState: presentation.queueState,
    queueStateLabel: presentation.queueStateLabel,
    queueStateDetail: presentation.queueStateDetail,
    urgencyCue: presentation.urgencyCue,
    assignmentStatus: presentation.assignmentStatus,
    assignmentStatusLabel: presentation.assignmentStatusLabel,
    assignedOwnerLabel: request.assignment?.ownerLabel ?? null,
    intervention: buildInterventionSummary(request),
    receivedAt: request.createdAt,
    updatedAt: latestHistoryEntry.occurredAt,
    latestChangeSummary: latestHistoryEntry.changeSummary,
    priority: presentation.priority,
  };
}

function sortQueue(
  left: OpsQueueItem & { priority: number },
  right: OpsQueueItem & { priority: number },
) {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  return right.receivedAt.localeCompare(left.receivedAt);
}

function buildQueueSummary(items: OpsQueueItem[]): OpsQueueSummary {
  return items.reduce<OpsQueueSummary>(
    (summary, item) => {
      summary.totalActive += 1;

      if (
        item.queueState === 'new' ||
        item.queueState === 'assignable' ||
        item.queueState === 'needsClarification' ||
        item.queueState === 'blocked'
      ) {
        summary.needsAttentionCount += 1;
      }

      if (item.queueState === 'assigned') {
        summary.assignedCount += 1;
      }

      if (item.queueState === 'blocked') {
        summary.blockedCount += 1;
      }

      if (item.queueState === 'unavailable') {
        summary.unavailableCount += 1;
      }

      return summary;
    },
    {
      totalActive: 0,
      needsAttentionCount: 0,
      assignedCount: 0,
      blockedCount: 0,
      unavailableCount: 0,
    },
  );
}

function removePriority(
  item: OpsQueueItem & { priority: number },
): OpsQueueItem {
  return {
    publicId: item.publicId,
    issueLabel: item.issueLabel,
    addressSummary: item.addressSummary,
    queueState: item.queueState,
    queueStateLabel: item.queueStateLabel,
    queueStateDetail: item.queueStateDetail,
    urgencyCue: item.urgencyCue,
    assignmentStatus: item.assignmentStatus,
    assignmentStatusLabel: item.assignmentStatusLabel,
    assignedOwnerLabel: item.assignedOwnerLabel,
    intervention: item.intervention,
    receivedAt: item.receivedAt,
    updatedAt: item.updatedAt,
    latestChangeSummary: item.latestChangeSummary,
  };
}

function buildStatusChangeSummary(input: {
  currentLifecycleState: RequestLifecycleState;
  currentPublicStatus: PersistedServiceRequest['publicStatus'];
  nextLifecycleState: RequestLifecycleState;
  note?: string;
}) {
  let summary: string;

  if (
    input.currentLifecycleState === 'intake_in_review' &&
    input.currentPublicStatus === 'received' &&
    input.nextLifecycleState === 'intake_in_review'
  ) {
    summary =
      'Operations completed the intake review and marked the request ready for assignment.';
  } else {
    switch (input.nextLifecycleState) {
      case 'intake_in_review':
        summary =
          'Operations returned the request to intake review for the next dispatch decision.';
        break;
      case 'dispatch_in_progress':
        summary =
          'Operations resumed dispatch after confirming the active fulfillment path.';
        break;
      case 'dispatch_delayed':
        summary =
          'Operations marked the request as delayed while the fulfillment blocker is worked through.';
        break;
      case 'clarification_needed':
        summary =
          'Operations marked the request as needing one more clarification before fulfillment can continue.';
        break;
      case 'completed':
        summary = 'Operations marked the request as completed.';
        break;
      case 'unfulfilled':
        summary =
          'Operations marked the request as unavailable through the current fulfillment path.';
        break;
      case 'awaiting_confirmation':
        summary =
          'Operations updated the request lifecycle while confirmation remained incomplete.';
        break;
    }
  }

  if (!input.note) {
    return summary;
  }

  return `${summary} Note: ${input.note}`;
}

function getStatusTransitionActionCopy(input: {
  currentLifecycleState: RequestLifecycleState;
  currentPublicStatus: PersistedServiceRequest['publicStatus'];
  nextLifecycleState: RequestLifecycleState;
}): Pick<OpsLifecycleTransitionOption, 'actionLabel' | 'actionDetail'> {
  if (
    input.currentLifecycleState === 'intake_in_review' &&
    input.currentPublicStatus === 'received' &&
    input.nextLifecycleState === 'intake_in_review'
  ) {
    return {
      actionLabel: 'Mark ready for assignment',
      actionDetail:
        'Complete the intake review so this request can move into assignment without resetting the customer timeline.',
    };
  }

  switch (input.nextLifecycleState) {
    case 'intake_in_review':
      return {
        actionLabel: 'Return to review',
        actionDetail:
          'Move the request back into review after clarification or recovery work is complete.',
      };
    case 'dispatch_in_progress':
      return {
        actionLabel: 'Resume dispatch',
        actionDetail:
          'Resume the active dispatch path once the blocker or clarification has been resolved.',
      };
    case 'dispatch_delayed':
      return {
        actionLabel: 'Mark delayed',
        actionDetail:
          'Record that the request is still active but the expected progress timing has changed.',
      };
    case 'clarification_needed':
      return {
        actionLabel: 'Request clarification',
        actionDetail:
          'Pause normal fulfillment progress until the missing operational detail is confirmed.',
      };
    case 'completed':
      return {
        actionLabel: 'Mark completed',
        actionDetail:
          'Close the lifecycle once fulfillment is complete and no further action is needed.',
      };
    case 'unfulfilled':
      return {
        actionLabel: 'Mark unavailable',
        actionDetail:
          'Record that the current fulfillment path cannot continue and preserve the recovery context.',
      };
    case 'awaiting_confirmation':
      return {
        actionLabel: 'Await confirmation',
        actionDetail: 'Return the request to an unconfirmed state.',
      };
  }
}

@Injectable()
export class OpsService {
  constructor(
    private readonly requestStoreService: RequestStoreService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly observabilityService: ObservabilityService = new ObservabilityService(),
  ) {}

  async getQueue(): Promise<OpsQueueResponse> {
    const requests = await this.requestStoreService.listRequests();
    const items = requests
      .map(toOpsQueueItem)
      .filter(
        (
          item,
        ): item is OpsQueueItem & {
          priority: number;
        } => item !== null,
      )
      .sort(sortQueue)
      .map(removePriority);

    const response: OpsQueueResponse = {
      items,
      summary: buildQueueSummary(items),
      refreshedAt: new Date().toISOString(),
    };

    await this.observabilityService.recordEvent({
      eventName: 'ops.queue.viewed',
      routeScope: 'ops',
      actorType: 'ops',
      outcome: 'success',
      metadata: {
        itemCount: items.length,
      },
    });

    return response;
  }

  async getRequestDetail(
    publicId: string,
  ): Promise<OpsRequestDetailResponse | null> {
    const request = await this.requestStoreService.getByPublicId(publicId);

    if (request === null) {
      return null;
    }

    this.observabilityService.annotateRequest({
      actorType: 'ops',
      publicId: request.publicId,
    });
    await this.observabilityService.recordEvent({
      eventName: 'ops.request.opened',
      routeScope: 'ops',
      actorType: 'ops',
      publicId: request.publicId,
      lifecycleState: request.lifecycleState,
      publicStatus: request.publicStatus,
      outcome: 'success',
      metadata: {
        issueTypeId: request.issueTypeId,
      },
    });

    return this.toRequestDetail(request);
  }

  async assignRequest(
    publicId: string,
    input: AssignRequestInput,
  ): Promise<OpsRequestDetailResponse> {
    const request = await this.requestStoreService.getByPublicId(publicId);

    if (request === null) {
      throw new OpsAssignmentError(
        'OPS_REQUEST_NOT_FOUND',
        'We could not open that operations request right now.',
        'Return to the queue and choose an active request again.',
        'notFound',
      );
    }

    const owner = AVAILABLE_ASSIGNMENT_OWNERS.find(
      (candidate) => candidate.ownerId === input.ownerId,
    );

    if (!owner) {
      throw new OpsAssignmentError(
        'OPS_ASSIGNMENT_OWNER_INVALID',
        'We could not assign that fulfillment owner.',
        'Choose one of the available owners and try again.',
      );
    }

    const validation = validateLifecycleTransition({
      currentLifecycleState: request.lifecycleState,
      currentPublicStatus: request.publicStatus,
      nextLifecycleState: 'dispatch_in_progress',
      hasAssignment: request.assignment !== undefined,
      source: 'ops-assignment',
    });

    if (!validation.isAllowed) {
      throw new OpsAssignmentError(
        'OPS_ASSIGNMENT_NOT_READY',
        'This request is not ready for assignment yet.',
        validation.reason,
      );
    }

    const assignedAt = new Date().toISOString();
    const updatedRequest =
      await this.requestStoreService.assignFulfillmentOwner({
        publicId,
        assignment: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          ownerLabel: owner.ownerLabel,
          assignedAt,
          ...(input.note ? { note: input.note } : {}),
        },
        lifecycleState: 'dispatch_in_progress',
        publicStatus: 'dispatching',
        note: `Operations assigned ${owner.ownerLabel} and moved the request into dispatch.`,
        actorId: input.actorId,
      });

    if (updatedRequest === null) {
      throw new OpsAssignmentError(
        'OPS_REQUEST_NOT_FOUND',
        'We could not open that operations request right now.',
        'Return to the queue and choose an active request again.',
        'notFound',
      );
    }

    this.observabilityService.annotateRequest({
      actorId: input.actorId,
      actorType: 'ops',
      publicId: updatedRequest.publicId,
    });
    await this.observabilityService.recordEvent({
      eventName: 'ops.request.assigned',
      routeScope: 'ops',
      actorType: 'ops',
      actorId: input.actorId,
      publicId: updatedRequest.publicId,
      lifecycleState: updatedRequest.lifecycleState,
      publicStatus: updatedRequest.publicStatus,
      outcome: 'success',
      metadata: {
        ownerId: updatedRequest.assignment?.ownerId,
        ownerType: updatedRequest.assignment?.ownerType,
      },
    });

    return this.toRequestDetail(updatedRequest);
  }

  async updateRequestStatus(
    publicId: string,
    input: UpdateRequestStatusInput,
  ): Promise<OpsRequestDetailResponse> {
    const request = await this.requestStoreService.getByPublicId(publicId);

    if (request === null) {
      throw new OpsStatusUpdateError(
        'OPS_REQUEST_NOT_FOUND',
        'We could not open that operations request right now.',
        'Return to the queue and choose an active request again.',
        'notFound',
      );
    }

    const validation = validateLifecycleTransition({
      currentLifecycleState: request.lifecycleState,
      currentPublicStatus: request.publicStatus,
      nextLifecycleState: input.nextLifecycleState,
      hasAssignment: request.assignment !== undefined,
      source: 'ops-status-update',
    });

    if (!validation.isAllowed) {
      throw new OpsStatusUpdateError(
        'OPS_STATUS_TRANSITION_INVALID',
        'We could not apply that lifecycle update.',
        validation.reason,
      );
    }

    const nextPublicStatusPresentation =
      resolveTransitionPublicRequestStatusPresentation({
        currentLifecycleState: request.lifecycleState,
        currentPublicStatus: request.publicStatus,
        nextLifecycleState: input.nextLifecycleState,
      });

    const updatedRequest =
      await this.requestStoreService.transitionRequestLifecycle({
        publicId,
        lifecycleState: input.nextLifecycleState,
        publicStatus: nextPublicStatusPresentation.publicStatus,
        occurredAt: new Date().toISOString(),
        note: buildStatusChangeSummary({
          currentLifecycleState: request.lifecycleState,
          currentPublicStatus: request.publicStatus,
          nextLifecycleState: input.nextLifecycleState,
          note: input.note,
        }),
        actorType: 'ops',
        actorId: input.actorId,
      });

    if (updatedRequest === null) {
      throw new OpsStatusUpdateError(
        'OPS_REQUEST_NOT_FOUND',
        'We could not open that operations request right now.',
        'Return to the queue and choose an active request again.',
        'notFound',
      );
    }

    this.observabilityService.annotateRequest({
      actorId: input.actorId,
      actorType: 'ops',
      publicId: updatedRequest.publicId,
    });
    await this.observabilityService.recordEvent({
      eventName: 'ops.request.status_updated',
      routeScope: 'ops',
      actorType: 'ops',
      actorId: input.actorId,
      publicId: updatedRequest.publicId,
      lifecycleState: updatedRequest.lifecycleState,
      publicStatus: updatedRequest.publicStatus,
      outcome: 'success',
      metadata: {
        nextLifecycleState: input.nextLifecycleState,
      },
    });

    return this.toRequestDetail(updatedRequest);
  }

  private toRequestDetail(
    request: PersistedServiceRequest,
  ): OpsRequestDetailResponse {
    const eligibility = getAssignmentEligibility(request);

    return {
      publicId: request.publicId,
      issueTypeId: request.issueTypeId,
      issueLabel: request.issueLabel,
      createdAt: request.createdAt,
      serviceLocation: request.serviceLocation,
      classification: request.classification,
      currentState: this.buildCurrentState(request),
      serviceability: this.buildServiceabilitySummary(request),
      intakeAnswers: this.buildIntakeAnswers(request),
      customerContext: this.buildCustomerContext(request),
      assignment: {
        currentAssignment: toCurrentAssignment(request.assignment),
        availableOwners: AVAILABLE_ASSIGNMENT_OWNERS,
        canAssign: eligibility.canAssign,
        assignmentBlockedReason: eligibility.assignmentBlockedReason,
      },
      intervention: buildInterventionSummary(request),
      availableTransitions: this.buildAvailableTransitions(request),
      history: request.history.map((entry) => this.toHistoryEntry(entry)),
    };
  }

  private buildIntakeAnswers(
    request: PersistedServiceRequest,
  ): OpsRequestDetailAnswer[] {
    const questionSet = this.referenceDataService.getIntakeQuestionSet(
      request.issueTypeId,
    );

    return request.answers.map((answer) => {
      const question = questionSet?.questions.find(
        (entry) => entry.id === answer.questionId,
      );

      return {
        questionId: answer.questionId,
        questionLabel: question?.prompt ?? answer.questionId,
        answerValue: answer.value,
        answerLabel: formatAnswerValue(answer.value),
      };
    });
  }

  private buildCurrentState(
    request: PersistedServiceRequest,
  ): OpsRequestDetailCurrentState {
    const latestHistoryEntry = getLatestHistoryEntry(request);
    const lifecyclePresentation = getLifecycleStatePresentation(
      request.lifecycleState,
    );

    return {
      lifecycleState: request.lifecycleState,
      lifecycleStateLabel: lifecyclePresentation.lifecycleStateLabel,
      lifecycleStateDetail: lifecyclePresentation.lifecycleStateDetail,
      publicStatus: request.publicStatus,
      publicStatusLabel: latestHistoryEntry.customerSnapshot.publicStatusLabel,
      publicStatusDetail:
        latestHistoryEntry.customerSnapshot.publicStatusDetail,
    };
  }

  private buildServiceabilitySummary(
    request: PersistedServiceRequest,
  ): OpsRequestServiceabilitySummary {
    const dispatchReadiness = getDispatchReadiness(request.lifecycleState);
    const intakeDecision = this.referenceDataService.evaluateIntakeDecision(
      request.issueTypeId,
      request.answers,
      request.serviceLocation,
    );

    return {
      serviceabilityStatus: request.classification.serviceabilityStatus,
      serviceabilityLabel: getServiceabilityLabel(
        request.classification.serviceabilityStatus,
      ),
      classificationHeadline: request.classification.summaryHeadline,
      classificationDetail: request.classification.summaryDetail,
      scopeDecisionLabel: intakeDecision.scopeDecision.scopeDecisionLabel,
      scopeDecisionDetail: intakeDecision.scopeDecision.scopeDecisionDetail,
      coverageDecisionLabel: intakeDecision.scopeDecision.coverageDecisionLabel,
      coverageDecisionDetail:
        intakeDecision.scopeDecision.coverageDecisionDetail,
      dispatchReadiness: dispatchReadiness.dispatchReadiness,
      dispatchReadinessLabel: dispatchReadiness.dispatchReadinessLabel,
      dispatchReadinessDetail: dispatchReadiness.dispatchReadinessDetail,
    };
  }

  private buildCustomerContext(
    request: PersistedServiceRequest,
  ): OpsCustomerContext {
    return {
      containmentGuidance:
        request.customerContext?.shownContainmentGuidance ?? null,
      requestReviewSummary:
        request.customerContext?.shownRequestReviewSummary ?? null,
    };
  }

  private buildAvailableTransitions(
    request: PersistedServiceRequest,
  ): OpsLifecycleTransitionOption[] {
    return getAllowedOpsStatusTransitions({
      lifecycleState: request.lifecycleState,
      publicStatus: request.publicStatus,
      hasAssignment: request.assignment !== undefined,
    }).map((nextLifecycleState) => {
      const nextPresentation =
        getLifecycleStatePresentation(nextLifecycleState);
      const nextPublicStatusPresentation =
        resolveTransitionPublicRequestStatusPresentation({
          currentLifecycleState: request.lifecycleState,
          currentPublicStatus: request.publicStatus,
          nextLifecycleState,
        });
      const actionCopy = getStatusTransitionActionCopy({
        currentLifecycleState: request.lifecycleState,
        currentPublicStatus: request.publicStatus,
        nextLifecycleState,
      });

      return {
        nextLifecycleState,
        actionLabel: actionCopy.actionLabel,
        actionDetail: actionCopy.actionDetail,
        nextLifecycleStateLabel: nextPresentation.lifecycleStateLabel,
        nextLifecycleStateDetail: nextPresentation.lifecycleStateDetail,
        publicStatus: nextPublicStatusPresentation.publicStatus,
        publicStatusLabel: nextPublicStatusPresentation.publicStatusLabel,
        publicStatusDetail: nextPublicStatusPresentation.publicStatusDetail,
      };
    });
  }

  private toHistoryEntry(
    entry: PersistedRequestHistoryEntry,
  ): OpsRequestDetailHistoryEntry {
    return {
      previousLifecycleState: entry.previousLifecycleState,
      nextLifecycleState: entry.nextLifecycleState,
      previousPublicStatus: entry.previousPublicStatus,
      nextPublicStatus: entry.nextPublicStatus,
      occurredAt: entry.occurredAt,
      actorType: entry.actorType,
      actorId: entry.actorId,
      changeSummary: entry.changeSummary,
      intervention: toHistoryIntervention(entry),
      customerSnapshot: {
        publicStatus: entry.nextPublicStatus,
        ...entry.customerSnapshot,
      },
    };
  }
}
