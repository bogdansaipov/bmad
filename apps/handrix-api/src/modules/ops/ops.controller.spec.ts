import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';
import type { AuthenticatedInternalRequest } from '../auth/internal-auth.types';

describe('OpsController', () => {
  it('returns the protected ops queue in the shared success envelope', async () => {
    const queue = {
      items: [
        {
          publicId: 'hrx_ops_1',
          issueLabel: 'Slow drain',
          addressSummary: '15 Spring Street, New York',
          queueState: 'new' as const,
          queueStateLabel: 'New request',
          queueStateDetail: 'Needs first-pass operations review.',
          urgencyCue: 'New intake',
          assignmentStatus: 'unassigned' as const,
          assignmentStatusLabel: 'Unassigned',
          intervention: null,
          receivedAt: '2026-04-20T13:00:00.000Z',
          updatedAt: '2026-04-20T13:00:00.000Z',
          latestChangeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
        },
      ],
      summary: {
        totalActive: 1,
        needsAttentionCount: 1,
        assignedCount: 0,
        blockedCount: 0,
        unavailableCount: 0,
      },
      refreshedAt: '2026-04-20T13:00:00.000Z',
    };
    const getQueue = jest.fn().mockResolvedValue(queue);
    const opsService = {
      getQueue,
    } as unknown as OpsService;
    const controller = new OpsController(opsService);

    const response = await controller.getQueue();

    expect(getQueue).toHaveBeenCalledTimes(1);
    expect(response.data).toEqual(queue);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns the protected ops request detail in the shared success envelope', async () => {
    const requestDetail = {
      publicId: 'hrx_ops_1',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      createdAt: '2026-04-20T13:00:00.000Z',
      serviceLocation: {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: '',
      },
      classification: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable' as const,
        nextStep: 'continueToContainment' as const,
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      currentState: {
        lifecycleState: 'intake_in_review' as const,
        lifecycleStateLabel: 'Intake in review',
        lifecycleStateDetail:
          'Operations is still reviewing the intake details before assignment.',
        publicStatus: 'received' as const,
        publicStatusLabel: 'Request received',
        publicStatusDetail:
          'Our team is reviewing your issue details and service location so we can confirm the best next step.',
      },
      serviceability: {
        serviceabilityStatus: 'serviceable' as const,
        serviceabilityLabel: 'Serviceable',
        classificationHeadline:
          'This request can keep moving through the guided flow.',
        classificationDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
        dispatchReadiness: 'readyForAssignment' as const,
        dispatchReadinessLabel: 'Reviewing for assignment',
        dispatchReadinessDetail:
          'The request is active and being reviewed for the next dispatch decision.',
      },
      intakeAnswers: [],
      customerContext: {
        containmentGuidance: null,
        requestReviewSummary: null,
      },
      assignment: {
        currentAssignment: null,
        availableOwners: [
          {
            ownerType: 'provider' as const,
            ownerTypeLabel: 'Provider',
            ownerId: 'provider_northstar',
            ownerLabel: 'Northstar Plumbing Co.',
            description: 'Primary plumbing partner for central neighborhoods.',
          },
        ],
        canAssign: true,
        assignmentBlockedReason: null,
      },
      intervention: null,
      availableTransitions: [],
      history: [
        {
          previousLifecycleState: null,
          nextLifecycleState: 'intake_in_review' as const,
          previousPublicStatus: null,
          nextPublicStatus: 'received' as const,
          occurredAt: '2026-04-20T13:00:00.000Z',
          actorType: 'customer' as const,
          changeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
          intervention: null,
          customerSnapshot: {
            publicStatus: 'received' as const,
            publicStatusLabel: 'Request received',
            publicStatusDetail:
              'Our team is reviewing your issue details and service location so we can confirm the best next step.',
            nextStepDetail:
              'Handrix is reviewing your request details and service location before the next update.',
            recoveryState: null,
          },
        },
      ],
    };
    const getRequestDetail = jest.fn().mockResolvedValue(requestDetail);
    const opsService = {
      getQueue: jest.fn(),
      getRequestDetail,
    } as unknown as OpsService;
    const controller = new OpsController(opsService);

    const response = await controller.getRequestDetail('hrx_ops_1');

    expect(getRequestDetail).toHaveBeenCalledWith('hrx_ops_1');
    expect(response.data).toEqual(requestDetail);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns the protected assignment update in the shared success envelope', async () => {
    const updatedRequestDetail = {
      publicId: 'hrx_ops_1',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      createdAt: '2026-04-20T13:00:00.000Z',
      serviceLocation: {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: '',
      },
      classification: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable' as const,
        nextStep: 'continueToContainment' as const,
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      currentState: {
        lifecycleState: 'dispatch_in_progress' as const,
        lifecycleStateLabel: 'Dispatch in progress',
        lifecycleStateDetail:
          'The request is moving through dispatch after review.',
        publicStatus: 'dispatching' as const,
        publicStatusLabel: 'Dispatch in progress',
        publicStatusDetail:
          'Handrix is coordinating the active fulfillment step for this request.',
      },
      serviceability: {
        serviceabilityStatus: 'serviceable' as const,
        serviceabilityLabel: 'Serviceable',
        classificationHeadline:
          'This request can keep moving through the guided flow.',
        classificationDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
        dispatchReadiness: 'dispatchInProgress' as const,
        dispatchReadinessLabel: 'Dispatch in progress',
        dispatchReadinessDetail:
          'A fulfillment path is already active and should stay aligned with customer updates.',
      },
      intakeAnswers: [],
      customerContext: {
        containmentGuidance: null,
        requestReviewSummary: null,
      },
      assignment: {
        currentAssignment: {
          ownerType: 'provider' as const,
          ownerTypeLabel: 'Provider',
          ownerId: 'provider_northstar',
          ownerLabel: 'Northstar Plumbing Co.',
          assignedAt: '2026-04-20T13:10:00.000Z',
          note: 'Closest partner for this ZIP code.',
        },
        availableOwners: [
          {
            ownerType: 'provider' as const,
            ownerTypeLabel: 'Provider',
            ownerId: 'provider_northstar',
            ownerLabel: 'Northstar Plumbing Co.',
            description: 'Primary plumbing partner for central neighborhoods.',
          },
        ],
        canAssign: false,
        assignmentBlockedReason:
          'This request already has an active fulfillment owner.',
      },
      intervention: null,
      availableTransitions: [],
      history: [
        {
          previousLifecycleState: 'intake_in_review' as const,
          nextLifecycleState: 'dispatch_in_progress' as const,
          previousPublicStatus: 'inReview' as const,
          nextPublicStatus: 'dispatching' as const,
          occurredAt: '2026-04-20T13:10:00.000Z',
          actorType: 'ops' as const,
          actorId: 'ops-default-user',
          changeSummary:
            'Operations assigned Northstar Plumbing Co. and moved the request into dispatch.',
          intervention: null,
          customerSnapshot: {
            publicStatus: 'dispatching' as const,
            publicStatusLabel: 'Dispatch in progress',
            publicStatusDetail:
              'Handrix is coordinating the active fulfillment step for this request.',
            nextStepDetail:
              'Handrix will share the next dispatch update as the request moves forward.',
            recoveryState: null,
          },
        },
      ],
    };
    const assignRequest = jest.fn().mockResolvedValue(updatedRequestDetail);
    const opsService = {
      getQueue: jest.fn(),
      getRequestDetail: jest.fn(),
      assignRequest,
    } as unknown as OpsService;
    const controller = new OpsController(opsService);

    const response = await controller.assignRequest(
      'hrx_ops_1',
      {
        ownerId: 'provider_northstar',
        note: 'Closest partner for this ZIP code.',
      },
      {
        user: {
          id: 'ops-default-user',
          email: 'ops@handrix.local',
          displayName: 'Operations Coordinator',
          role: 'ops',
        },
      } as AuthenticatedInternalRequest,
    );

    expect(assignRequest).toHaveBeenCalledWith('hrx_ops_1', {
      ownerId: 'provider_northstar',
      note: 'Closest partner for this ZIP code.',
      actorId: 'ops-default-user',
    });
    expect(response.data).toEqual(updatedRequestDetail);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });

  it('returns the protected lifecycle update in the shared success envelope', async () => {
    const updatedRequestDetail = {
      publicId: 'hrx_ops_1',
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      createdAt: '2026-04-20T13:00:00.000Z',
      serviceLocation: {
        addressLine1: '15 Spring Street',
        city: 'New York',
        postalCode: '10011',
        unitOrAccessNote: '',
        locationDetails: '',
      },
      classification: {
        issueTypeId: 'slow-drain',
        serviceabilityStatus: 'serviceable' as const,
        nextStep: 'continueToContainment' as const,
        summaryHeadline:
          'This request can keep moving through the guided flow.',
        summaryDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
      },
      currentState: {
        lifecycleState: 'intake_in_review' as const,
        lifecycleStateLabel: 'Intake in review',
        lifecycleStateDetail:
          'Operations is still reviewing the intake details before assignment.',
        publicStatus: 'inReview' as const,
        publicStatusLabel: 'Under review',
        publicStatusDetail:
          'Your request is being reviewed so we can confirm the right fulfillment path and next update.',
      },
      serviceability: {
        serviceabilityStatus: 'serviceable' as const,
        serviceabilityLabel: 'Serviceable',
        classificationHeadline:
          'This request can keep moving through the guided flow.',
        classificationDetail:
          'You are still within the supported plumbing scope and service area for the next Handrix step.',
        dispatchReadiness: 'readyForAssignment' as const,
        dispatchReadinessLabel: 'Reviewing for assignment',
        dispatchReadinessDetail:
          'The request is active and being reviewed for the next dispatch decision.',
      },
      intakeAnswers: [],
      customerContext: {
        containmentGuidance: null,
        requestReviewSummary: null,
      },
      assignment: {
        currentAssignment: null,
        availableOwners: [
          {
            ownerType: 'provider' as const,
            ownerTypeLabel: 'Provider',
            ownerId: 'provider_northstar',
            ownerLabel: 'Northstar Plumbing Co.',
            description: 'Primary plumbing partner for central neighborhoods.',
          },
        ],
        canAssign: true,
        assignmentBlockedReason: null,
      },
      intervention: null,
      availableTransitions: [
        {
          nextLifecycleState: 'clarification_needed' as const,
          actionLabel: 'Request clarification',
          actionDetail:
            'Pause normal fulfillment progress until the missing operational detail is confirmed.',
          nextLifecycleStateLabel: 'Clarification needed',
          nextLifecycleStateDetail:
            'The request needs additional detail before fulfillment can continue.',
          publicStatus: 'needsClarification' as const,
          publicStatusLabel: 'More details needed',
          publicStatusDetail:
            'We need one more clarification before this request can keep moving, and we will guide you through the next step clearly.',
        },
      ],
      history: [
        {
          previousLifecycleState: 'intake_in_review' as const,
          nextLifecycleState: 'intake_in_review' as const,
          previousPublicStatus: 'received' as const,
          nextPublicStatus: 'inReview' as const,
          occurredAt: '2026-04-20T13:05:00.000Z',
          actorType: 'ops' as const,
          actorId: 'ops-default-user',
          changeSummary:
            'Operations completed the intake review and marked the request ready for assignment.',
          intervention: null,
          customerSnapshot: {
            publicStatus: 'inReview' as const,
            publicStatusLabel: 'Under review',
            publicStatusDetail:
              'Your request is being reviewed so we can confirm the right fulfillment path and next update.',
            nextStepDetail:
              'Handrix is reviewing your request details and service location before the next update.',
            recoveryState: null,
          },
        },
      ],
    };
    const updateRequestStatus = jest
      .fn()
      .mockResolvedValue(updatedRequestDetail);
    const opsService = {
      getQueue: jest.fn(),
      getRequestDetail: jest.fn(),
      assignRequest: jest.fn(),
      updateRequestStatus,
    } as unknown as OpsService;
    const controller = new OpsController(opsService);

    const response = await controller.updateRequestStatus(
      'hrx_ops_1',
      {
        nextLifecycleState: 'intake_in_review',
      },
      {
        user: {
          id: 'ops-default-user',
          email: 'ops@handrix.local',
          displayName: 'Operations Coordinator',
          role: 'ops',
        },
      } as AuthenticatedInternalRequest,
    );

    expect(updateRequestStatus).toHaveBeenCalledWith('hrx_ops_1', {
      nextLifecycleState: 'intake_in_review',
      actorId: 'ops-default-user',
    });
    expect(response.data).toEqual(updatedRequestDetail);
    expect(typeof response.meta?.generatedAt).toBe('string');
  });
});
