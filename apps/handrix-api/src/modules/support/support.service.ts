import type {
  InternalSupportSession,
  SupportInterventionKind,
  SupportInterventionRequest,
  SupportRequestDetailAnswer,
  SupportRequestDetailAssignment,
  SupportRequestDetailCurrentState,
  SupportRequestDetailCustomerContext,
  SupportRequestDetailExplanation,
  SupportRequestDetailFollowUp,
  SupportRequestDetailHistoryEntry,
  SupportRequestDetailHistoryIntervention,
  SupportRequestDetailIntervention,
  SupportRequestDetailResponse,
  SupportRequestSearchResponse,
  SupportRequestSearchResult,
  SupportSearchRequestQuery,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import { ObservabilityService } from '../../common/observability/observability.service';
import type { AuthenticatedInternalUser } from '../auth/internal-auth.types';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import {
  getRequestInterventionKindForLifecycle,
  getRequestLifecyclePresentation,
} from '../requests/domain/request-lifecycle-metadata';
import {
  getPublicRequestStatusPresentation,
  resolveTransitionPublicRequestStatusPresentation,
} from '../requests/request-status.presenter';
import { validateLifecycleTransition } from '../requests/domain/request-state-machine';
import type {
  PersistedRequestAssignment,
  PersistedRequestHistoryEntry,
  PersistedRequestHistoryVisibility,
  PersistedRequestInterventionKind,
  PersistedServiceRequest,
  RequestLifecycleState,
} from '../requests/request-store.service';
import { RequestStoreService } from '../requests/request-store.service';

type SearchRequestsInput = {
  q?: string;
  limit?: number;
};

type RecordSupportInterventionInput = SupportInterventionRequest & {
  actorId: string;
};

type InterventionPresentation = {
  label: string;
  detail: string;
};

type ExplanationPresentation = {
  kind: SupportRequestDetailExplanation['kind'];
  label: string;
  detail: string;
};

const DEFAULT_SEARCH_LIMIT = 25;
const MAX_SEARCH_LIMIT = 50;
const MIN_NORMALIZED_QUERY_LENGTH = 2;

export class SupportInterventionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly recoveryHint: string,
    readonly status: 'notFound' | 'badRequest' = 'badRequest',
  ) {
    super(message);
    this.name = 'SupportInterventionError';
  }
}

function getLifecycleLabelPresentation(lifecycleState: RequestLifecycleState): {
  label: string;
  detail: string;
} {
  return getRequestLifecyclePresentation(lifecycleState);
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
      };
    case 'blocker':
      return {
        label: 'Operational blocker',
        detail:
          'An active fulfillment path exists, but a blocker or delay needs hands-on intervention.',
      };
    case 'unavailable':
      return {
        label: 'Unavailable outcome',
        detail:
          'The current fulfillment path cannot continue and the fallback explanation needs to stay visible.',
      };
  }
}

function getVisibilityLabel(
  visibility: PersistedRequestHistoryVisibility,
): string {
  return visibility === 'internal' ? 'Internal only' : 'Customer visible';
}

function mapKindToLifecycleState(
  kind: SupportInterventionKind,
): RequestLifecycleState {
  switch (kind) {
    case 'clarification':
      return 'clarification_needed';
    case 'blocker':
      return 'dispatch_delayed';
    case 'unavailable':
      return 'unfulfilled';
  }
}

function getInterventionLabelForLifecycleState(
  lifecycleState: RequestLifecycleState,
): string | null {
  const interventionKind = getCurrentInterventionKind(lifecycleState);

  if (interventionKind === null) {
    return null;
  }

  return getInterventionPresentation(interventionKind).label;
}

function formatAddressSummary(request: PersistedServiceRequest): string {
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

function recordMatchesQuery(
  request: PersistedServiceRequest,
  normalizedQ: string,
): boolean {
  const unitOrAccessNote =
    request.serviceLocation.unitOrAccessNote?.toLowerCase() ?? '';

  return (
    request.publicId.toLowerCase().includes(normalizedQ) ||
    request.issueLabel.toLowerCase().includes(normalizedQ) ||
    request.serviceLocation.addressLine1.toLowerCase().includes(normalizedQ) ||
    request.serviceLocation.city.toLowerCase().includes(normalizedQ) ||
    request.serviceLocation.postalCode.toLowerCase().includes(normalizedQ) ||
    unitOrAccessNote.includes(normalizedQ)
  );
}

function toSearchResult(
  request: PersistedServiceRequest,
): SupportRequestSearchResult {
  const latestHistoryEntry = getLatestHistoryEntry(request);
  const lifecyclePresentation = getLifecycleLabelPresentation(
    request.lifecycleState,
  );

  return {
    publicId: request.publicId,
    issueLabel: request.issueLabel,
    addressSummary: formatAddressSummary(request),
    currentPublicStatusLabel:
      latestHistoryEntry.customerSnapshot.publicStatusLabel,
    currentPublicStatusDetail:
      latestHistoryEntry.customerSnapshot.publicStatusDetail,
    currentInternalLifecycleLabel: lifecyclePresentation.label,
    currentInternalLifecycleDetail: lifecyclePresentation.detail,
    receivedAt: request.createdAt,
    lastUpdatedAt: latestHistoryEntry.occurredAt,
    latestChangeSummary: latestHistoryEntry.changeSummary,
    currentAssignmentOwnerLabel: request.assignment?.ownerLabel ?? null,
    interventionLabel: getInterventionLabelForLifecycleState(
      request.lifecycleState,
    ),
  };
}

function compareByRecency(
  left: PersistedServiceRequest,
  right: PersistedServiceRequest,
) {
  const leftLatest = getLatestHistoryEntry(left).occurredAt;
  const rightLatest = getLatestHistoryEntry(right).occurredAt;

  if (leftLatest !== rightLatest) {
    return rightLatest.localeCompare(leftLatest);
  }

  return right.createdAt.localeCompare(left.createdAt);
}

function toAssignment(
  assignment: PersistedRequestAssignment | undefined,
): SupportRequestDetailAssignment | null {
  if (!assignment) {
    return null;
  }

  return {
    ownerType: assignment.ownerType,
    ownerTypeLabel:
      assignment.ownerType === 'provider' ? 'Provider' : 'Internal owner',
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
    .find(
      (entry) =>
        entry.intervention?.kind === kind && entry.visibility !== 'internal',
    );
}

function toRelevantChangeEntry(
  entry: PersistedRequestHistoryEntry | undefined,
): SupportRequestDetailIntervention['latestRelevantChange'] {
  return entry
    ? {
        occurredAt: entry.occurredAt,
        actorType: entry.actorType,
        changeSummary: entry.changeSummary,
      }
    : null;
}

function buildInterventionSummary(
  request: PersistedServiceRequest,
): SupportRequestDetailIntervention | null {
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
    customerImpact:
      latestRelevantEntry?.customerSnapshot.nextStepDetail ??
      presentation.detail,
    latestRelevantChange: toRelevantChangeEntry(latestRelevantEntry),
  };
}

function toHistoryIntervention(
  entry: PersistedRequestHistoryEntry,
): SupportRequestDetailHistoryIntervention | null {
  if (!entry.intervention) {
    return null;
  }

  return {
    kind: entry.intervention.kind,
    label: getInterventionPresentation(entry.intervention.kind).label,
    detail: entry.intervention.detail ?? entry.changeSummary,
  };
}

function toLatestSupportFollowUp(
  request: PersistedServiceRequest,
): SupportRequestDetailFollowUp | null {
  const latestSupportEntry = [...request.history]
    .reverse()
    .find((entry) => entry.actorType === 'support' && entry.intervention);

  if (!latestSupportEntry?.intervention) {
    return null;
  }

  return {
    kind: latestSupportEntry.intervention.kind,
    label: getInterventionPresentation(latestSupportEntry.intervention.kind)
      .label,
    detail:
      latestSupportEntry.intervention.detail ??
      latestSupportEntry.changeSummary,
    recordedAt: latestSupportEntry.occurredAt,
    actorType: 'support',
    visibility: latestSupportEntry.visibility ?? 'customer',
    visibilityLabel: getVisibilityLabel(
      latestSupportEntry.visibility ?? 'customer',
    ),
    affectsLifecycle:
      latestSupportEntry.previousLifecycleState !==
        latestSupportEntry.nextLifecycleState ||
      latestSupportEntry.previousPublicStatus !==
        latestSupportEntry.nextPublicStatus,
  };
}

function getCurrentRecoveryState(request: PersistedServiceRequest) {
  return getLatestHistoryEntry(request).customerSnapshot.recoveryState;
}

function getExplanationPresentation(
  request: PersistedServiceRequest,
): ExplanationPresentation | null {
  switch (request.lifecycleState) {
    case 'clarification_needed':
      return {
        kind: 'clarification',
        label: 'Clarification needed',
        detail:
          'Support can explain that one missing detail is still blocking progress before normal fulfillment can continue.',
      };
    case 'dispatch_delayed':
      return {
        kind: 'blocker',
        label: 'Operational blocker',
        detail:
          'Support can explain that fulfillment is still active, but an operational blocker is delaying the next confirmed milestone.',
      };
    case 'unfulfilled':
      return {
        kind: 'unavailable',
        label: 'Unavailable outcome',
        detail:
          'Support can explain that the original fulfillment path is no longer available and the reply should stay anchored on the fallback path.',
      };
    case 'awaiting_confirmation':
    case 'intake_in_review':
    case 'dispatch_in_progress':
    case 'completed': {
      const recoveryState = getCurrentRecoveryState(request);

      if (recoveryState?.kind === 'delay') {
        return {
          kind: 'delay',
          label: 'Dispatch delayed',
          detail:
            'Support can explain that the request is still moving, but the timing has changed and the customer should expect a revised update.',
        };
      }

      return null;
    }
  }
}

function getLatestRelevantExplanationEntry(
  request: PersistedServiceRequest,
): PersistedRequestHistoryEntry | undefined {
  const interventionKind = getCurrentInterventionKind(request.lifecycleState);

  if (interventionKind !== null) {
    return getLatestRelevantInterventionEntry(request, interventionKind);
  }

  const currentRecoveryState = getCurrentRecoveryState(request);

  if (currentRecoveryState === null) {
    return undefined;
  }

  return [...request.history]
    .reverse()
    .find(
      (entry) =>
        entry.customerSnapshot.recoveryState?.kind ===
        currentRecoveryState.kind,
    );
}

function toLifecycleLabel(
  lifecycleState: RequestLifecycleState | null,
): string | null {
  if (lifecycleState === null) {
    return null;
  }

  return getLifecycleLabelPresentation(lifecycleState).label;
}

function toPublicStatusLabel(
  publicStatus: SupportRequestDetailHistoryEntry['nextPublicStatus'] | null,
) {
  if (publicStatus === null) {
    return null;
  }

  return getPublicRequestStatusPresentation(publicStatus).publicStatusLabel;
}

@Injectable()
export class SupportService {
  constructor(
    private readonly requestStoreService: RequestStoreService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly observabilityService: ObservabilityService = new ObservabilityService(),
  ) {}

  buildSessionPayload(user: AuthenticatedInternalUser): InternalSupportSession {
    this.observabilityService.annotateRequest({
      actorId: user.id,
      actorType: 'support',
    });
    void this.observabilityService.recordEvent({
      eventName: 'support.session.opened',
      routeScope: 'support',
      actorType: 'support',
      actorId: user.id,
      outcome: 'success',
      metadata: {
        userRole: user.role,
      },
    });

    return {
      scope: 'support',
      message: 'Support access granted.',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async searchRequests(
    input: SearchRequestsInput,
  ): Promise<SupportRequestSearchResponse> {
    const rawQuery = typeof input.q === 'string' ? input.q : null;
    const normalizedQ = (rawQuery ?? '').trim().toLowerCase();
    const limit = input.limit ?? DEFAULT_SEARCH_LIMIT;
    const cappedLimit = Math.max(1, Math.min(limit, MAX_SEARCH_LIMIT));
    const refreshedAt = new Date().toISOString();

    if (normalizedQ.length < MIN_NORMALIZED_QUERY_LENGTH) {
      const response: SupportRequestSearchResponse = {
        items: [],
        summary: { totalMatched: 0, limitReached: false },
        refreshedAt,
        query: {
          q: rawQuery,
          normalizedQ,
          limit: cappedLimit,
        },
      };

      await this.observabilityService.recordEvent({
        eventName: 'support.search.performed',
        routeScope: 'support',
        actorType: 'support',
        outcome: 'success',
        metadata: {
          totalMatched: 0,
          returnedCount: 0,
          limit: cappedLimit,
          queryLength: normalizedQ.length,
        },
      });

      return response;
    }

    const requests = await this.requestStoreService.listRequests();
    const matched = requests.filter((request) =>
      recordMatchesQuery(request, normalizedQ),
    );

    const sorted = [...matched].sort(compareByRecency);
    const items = sorted.slice(0, cappedLimit).map(toSearchResult);

    const response: SupportRequestSearchResponse = {
      items,
      summary: {
        totalMatched: matched.length,
        limitReached: matched.length > items.length,
      },
      refreshedAt,
      query: {
        q: rawQuery,
        normalizedQ,
        limit: cappedLimit,
      },
    };

    await this.observabilityService.recordEvent({
      eventName: 'support.search.performed',
      routeScope: 'support',
      actorType: 'support',
      outcome: 'success',
      metadata: {
        totalMatched: matched.length,
        returnedCount: items.length,
        limit: cappedLimit,
        queryLength: normalizedQ.length,
      },
    });

    return response;
  }

  async getRequestDetail(
    publicId: string,
  ): Promise<SupportRequestDetailResponse | null> {
    const request = await this.requestStoreService.getByPublicId(publicId);

    if (request === null) {
      return null;
    }

    this.observabilityService.annotateRequest({
      actorType: 'support',
      publicId: request.publicId,
    });
    await this.observabilityService.recordEvent({
      eventName: 'support.request.opened',
      routeScope: 'support',
      actorType: 'support',
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

  async recordIntervention(
    publicId: string,
    input: RecordSupportInterventionInput,
  ): Promise<SupportRequestDetailResponse> {
    const request = await this.requestStoreService.getByPublicId(publicId);

    if (request === null) {
      throw new SupportInterventionError(
        'SUPPORT_REQUEST_NOT_FOUND',
        'We could not open that support request right now.',
        'Return to search and choose a request again.',
        'notFound',
      );
    }

    const nextLifecycleState = mapKindToLifecycleState(input.kind);
    const shouldUpdateLifecycle =
      input.updateLifecycle === true &&
      request.lifecycleState !== nextLifecycleState;

    if (shouldUpdateLifecycle) {
      const validation = validateLifecycleTransition({
        currentLifecycleState: request.lifecycleState,
        currentPublicStatus: request.publicStatus,
        nextLifecycleState,
        hasAssignment: request.assignment !== undefined,
        source: 'support-intervention',
      });

      if (!validation.isAllowed) {
        throw new SupportInterventionError(
          'SUPPORT_INTERVENTION_TRANSITION_INVALID',
          'We could not record that intervention with a lifecycle update.',
          validation.reason,
        );
      }
    }

    const updatedRequest =
      await this.requestStoreService.transitionRequestLifecycle({
        publicId,
        lifecycleState: shouldUpdateLifecycle
          ? nextLifecycleState
          : request.lifecycleState,
        publicStatus: shouldUpdateLifecycle
          ? resolveTransitionPublicRequestStatusPresentation({
              currentLifecycleState: request.lifecycleState,
              currentPublicStatus: request.publicStatus,
              nextLifecycleState,
            }).publicStatus
          : request.publicStatus,
        occurredAt: new Date().toISOString(),
        note: input.note,
        actorType: 'support',
        actorId: input.actorId,
        visibility: shouldUpdateLifecycle ? 'customer' : 'internal',
        intervention: {
          kind: input.kind,
          detail: input.note,
        },
      });

    if (updatedRequest === null) {
      throw new SupportInterventionError(
        'SUPPORT_REQUEST_NOT_FOUND',
        'We could not open that support request right now.',
        'Return to search and choose a request again.',
        'notFound',
      );
    }

    this.observabilityService.annotateRequest({
      actorId: input.actorId,
      actorType: 'support',
      publicId: updatedRequest.publicId,
    });
    await this.observabilityService.recordEvent({
      eventName: 'support.request.intervention_recorded',
      routeScope: 'support',
      actorType: 'support',
      actorId: input.actorId,
      publicId: updatedRequest.publicId,
      lifecycleState: updatedRequest.lifecycleState,
      publicStatus: updatedRequest.publicStatus,
      outcome: 'success',
      metadata: {
        kind: input.kind,
        updateLifecycle: input.updateLifecycle === true,
      },
    });

    return this.toRequestDetail(updatedRequest);
  }

  private toRequestDetail(
    request: PersistedServiceRequest,
  ): SupportRequestDetailResponse {
    const latestHistoryEntry = getLatestHistoryEntry(request);

    return {
      publicId: request.publicId,
      issueTypeId: request.issueTypeId,
      issueLabel: request.issueLabel,
      createdAt: request.createdAt,
      serviceLocation: request.serviceLocation,
      classification: request.classification,
      currentState: this.buildCurrentState(request),
      intakeAnswers: this.buildIntakeAnswers(request),
      customerContext: this.buildCustomerContext(request),
      assignment: toAssignment(request.assignment),
      intervention: buildInterventionSummary(request),
      explanation: this.buildExplanation(request),
      latestSupportFollowUp: toLatestSupportFollowUp(request),
      history: request.history.map((entry) => this.toHistoryEntry(entry)),
      latestChangeSummary: latestHistoryEntry.changeSummary,
      lastUpdatedAt: latestHistoryEntry.occurredAt,
    };
  }

  private buildCurrentState(
    request: PersistedServiceRequest,
  ): SupportRequestDetailCurrentState {
    const latestHistoryEntry = getLatestHistoryEntry(request);
    const lifecyclePresentation = getLifecycleLabelPresentation(
      request.lifecycleState,
    );

    return {
      lifecycleState: request.lifecycleState,
      lifecycleStateLabel: lifecyclePresentation.label,
      lifecycleStateDetail: lifecyclePresentation.detail,
      publicStatus: request.publicStatus,
      publicStatusLabel: latestHistoryEntry.customerSnapshot.publicStatusLabel,
      publicStatusDetail:
        latestHistoryEntry.customerSnapshot.publicStatusDetail,
    };
  }

  private buildIntakeAnswers(
    request: PersistedServiceRequest,
  ): SupportRequestDetailAnswer[] {
    const questionSet = this.referenceDataService.getIntakeQuestionSet(
      request.issueTypeId,
    );

    return request.answers.map((answer) => {
      const question = questionSet?.questions.find(
        (entry) => entry.id === answer.questionId,
      );

      return {
        questionLabel: question?.prompt ?? answer.questionId,
        answerLabel: formatAnswerValue(answer.value),
      };
    });
  }

  private buildCustomerContext(
    request: PersistedServiceRequest,
  ): SupportRequestDetailCustomerContext {
    return {
      containmentGuidance:
        request.customerContext?.shownContainmentGuidance ?? null,
      requestReviewSummary:
        request.customerContext?.shownRequestReviewSummary ?? null,
    };
  }

  private buildExplanation(
    request: PersistedServiceRequest,
  ): SupportRequestDetailExplanation | null {
    const presentation = getExplanationPresentation(request);

    if (presentation === null) {
      return null;
    }

    const currentRecoveryState = getCurrentRecoveryState(request);
    const latestRelevantChange = getLatestRelevantExplanationEntry(request);

    return {
      kind: presentation.kind,
      label: presentation.label,
      detail: presentation.detail,
      reasonDetail:
        latestRelevantChange?.changeSummary ??
        currentRecoveryState?.detail ??
        this.buildCurrentState(request).publicStatusDetail,
      expectationUpdate:
        currentRecoveryState?.expectationUpdate ??
        this.buildCurrentState(request).publicStatusDetail,
      nextActionLabel:
        currentRecoveryState?.nextActionLabel ?? 'Next best action',
      nextActionDetail:
        currentRecoveryState?.nextActionDetail ??
        getLatestHistoryEntry(request).customerSnapshot.nextStepDetail,
      ...(currentRecoveryState?.fallbackGuidance
        ? { fallbackGuidance: currentRecoveryState.fallbackGuidance }
        : {}),
      customerVisibleRecovery: currentRecoveryState,
      latestRelevantChange: toRelevantChangeEntry(latestRelevantChange),
    };
  }

  private toHistoryEntry(
    entry: PersistedRequestHistoryEntry,
  ): SupportRequestDetailHistoryEntry {
    return {
      previousLifecycleState: entry.previousLifecycleState,
      nextLifecycleState: entry.nextLifecycleState,
      previousLifecycleStateLabel: toLifecycleLabel(
        entry.previousLifecycleState,
      ),
      nextLifecycleStateLabel: getLifecycleLabelPresentation(
        entry.nextLifecycleState,
      ).label,
      previousPublicStatus: entry.previousPublicStatus,
      nextPublicStatus: entry.nextPublicStatus,
      previousPublicStatusLabel: toPublicStatusLabel(
        entry.previousPublicStatus,
      ),
      nextPublicStatusLabel: getPublicRequestStatusPresentation(
        entry.nextPublicStatus,
      ).publicStatusLabel,
      occurredAt: entry.occurredAt,
      actorType: entry.actorType,
      changeSummary: entry.changeSummary,
      visibility: entry.visibility ?? 'customer',
      visibilityLabel: getVisibilityLabel(entry.visibility ?? 'customer'),
      intervention: toHistoryIntervention(entry),
      customerSnapshot: {
        publicStatus: entry.nextPublicStatus,
        publicStatusLabel: entry.customerSnapshot.publicStatusLabel,
        publicStatusDetail: entry.customerSnapshot.publicStatusDetail,
        nextStepDetail: entry.customerSnapshot.nextStepDetail,
        recoveryState: entry.customerSnapshot.recoveryState,
      },
    };
  }
}

export type { SearchRequestsInput, SupportSearchRequestQuery };
