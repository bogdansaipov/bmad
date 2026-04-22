import {
  createErrorResponse,
  createSuccessResponse,
  requestLifecycleStates,
  supportedIssueTypes,
} from '@handrix/shared-contracts';

export const swaggerGeneratedAtExample = '2026-04-22T08:00:00.000Z';
export const swaggerOccurredAtExample = '2026-04-22T08:05:00.000Z';
export const swaggerPublicIdExample = 'hrx_demo_123';

function buildSuccessEnvelopeExample<T>(data: T) {
  return createSuccessResponse(data, {
    generatedAt: swaggerGeneratedAtExample,
  });
}

const serviceLocationExample = {
  addressLine1: '15 Spring Street',
  city: 'New York',
  postalCode: '10011',
  unitOrAccessNote: '',
  locationDetails: 'Bathroom sink on the second floor',
};

const intakeAnswersExample = [
  {
    questionId: 'singleDrainAffected',
    value: true,
  },
  {
    questionId: 'standingWater',
    value: true,
  },
];

const intakeAnswersDetailExample = [
  {
    questionLabel: 'Is only one drain running slowly?',
    answerLabel: 'Yes',
  },
];

const intakeAnswersOpsDetailExample = [
  {
    questionId: 'singleDrainAffected',
    questionLabel: 'Is only one drain running slowly?',
    answerValue: true,
    answerLabel: 'Yes',
  },
];

const classificationExample = {
  issueTypeId: 'slow-drain',
  serviceabilityStatus: 'serviceable' as const,
  nextStep: 'continueToContainment' as const,
  summaryHeadline: 'This request can keep moving through the guided flow.',
  summaryDetail:
    'You are still within the supported plumbing scope and service area for the next Handrix step.',
};

const containmentGuidanceExample = {
  issueTypeId: 'slow-drain',
  serviceabilityStatus: 'serviceable' as const,
  nextStep: 'continueToContainment' as const,
  variant: 'informational' as const,
  headline: 'Keep the water under control while we prepare the next step.',
  intro:
    'A slow drain is often manageable for the moment when the fixture stays out of use.',
  steps: [
    {
      title: 'Stop using the fixture',
      detail: 'Pausing water use lowers the chance of overflow.',
    },
  ],
  warnings: [],
  reassurance:
    'You are taking the right first step. We will keep the next step simple.',
  nextActionLabel: 'Continue to request review',
  nextActionHint:
    'Next, we will summarize timing, pricing expectations, and your request details.',
};

const requestReviewSummaryExample = {
  issueTypeId: 'slow-drain',
  issueLabel: 'Slow drain',
  headline: 'Review the request details before you confirm.',
  intro: 'A quick final check before submission.',
  sections: [
    {
      title: 'Issue details',
      editTarget: 'issueDetails' as const,
      editLabel: 'Edit issue details',
      items: [{ label: 'Selected issue', value: 'Slow drain' }],
    },
    {
      title: 'Service location',
      editTarget: 'serviceLocation' as const,
      editLabel: 'Edit service location',
      items: [{ label: 'Street address', value: '15 Spring Street' }],
    },
  ],
  eta: {
    label: 'Estimated response window',
    value: 'Usually within 2 to 4 hours',
    detail: 'Single-drain slowdowns are usually manageable for a short period.',
  },
  pricing: {
    label: 'Pricing expectation',
    value: 'Most visits start with an $89 to $139 assessment',
    detail: 'Any added work is confirmed before you approve it.',
  },
  nextSteps: {
    title: 'What happens next',
    detail:
      'After confirmation, Handrix creates the request and moves it into review.',
    bullets: [
      'Your issue details and service location are packaged into the request.',
    ],
  },
  confirmationLabel: 'Confirm request',
  confirmationHint:
    'We will create the request and keep the next updates clear.',
};

const receivedPublicStatusExample = {
  publicStatus: 'received' as const,
  publicStatusLabel: 'Request received',
  publicStatusDetail:
    'Our team is reviewing your issue details and service location so we can confirm the best next step.',
};

const dispatchingPublicStatusExample = {
  publicStatus: 'dispatching' as const,
  publicStatusLabel: 'Dispatch in progress',
  publicStatusDetail:
    'A Handrix team member is actively moving this request forward and preparing the next service update.',
};

const delayedRecoveryStateExample = {
  kind: 'delay' as const,
  title: 'Dispatch timing has shifted',
  detail:
    'The request is still active, but the original timing estimate changed.',
  expectationUpdate: 'A revised arrival window will follow in the next update.',
  nextActionLabel: 'Wait for the next update',
  nextActionDetail:
    'Handrix will share the next dispatch update as soon as the route is rechecked.',
};

const customerSnapshotReceivedExample = {
  ...receivedPublicStatusExample,
  nextStepDetail:
    'Handrix is reviewing your request details and service location before the next update.',
  recoveryState: null,
};

const customerSnapshotDispatchingExample = {
  ...dispatchingPublicStatusExample,
  nextStepDetail:
    'Handrix will share the next dispatch update as the request moves forward.',
  recoveryState: null,
};

export const authOpenApiExamples = {
  createInternalSession: {
    requestBody: {
      email: 'ops@handrix.local',
      password: 'ops-demo-pass',
    },
    successResponse: buildSuccessEnvelopeExample({
      accessToken: 'header.payload.signature',
      tokenType: 'Bearer' as const,
      issuedAt: swaggerGeneratedAtExample,
      expiresAt: '2026-04-22T16:00:00.000Z',
      user: {
        id: 'ops-default-user',
        email: 'ops@handrix.local',
        displayName: 'Operations Coordinator',
        role: 'ops' as const,
      },
    }),
    validationError: createErrorResponse({
      code: 'INTERNAL_AUTH_VALIDATION_FAILED',
      message: 'We could not start that staff session yet.',
      recoveryHint: 'Check the email and password fields and try again.',
    }),
    rejectedError: createErrorResponse({
      code: 'INTERNAL_AUTH_REJECTED',
      message: 'Those staff credentials were not accepted.',
      recoveryHint: 'Use an authorized staff account and try again.',
    }),
  },
  protectedErrors: {
    unauthorized: createErrorResponse({
      code: 'UNAUTHORIZED',
      message: 'A valid staff session is required.',
      recoveryHint: 'Sign in again and retry this protected request.',
    }),
    forbidden: createErrorResponse({
      code: 'FORBIDDEN',
      message: 'That staff role cannot access this protected route.',
      recoveryHint: 'Use a staff account with the required role.',
    }),
  },
};

export const healthOpenApiExamples = {
  response: buildSuccessEnvelopeExample({
    service: 'handrix-api' as const,
    status: 'ok' as const,
    supportedLifecycleStates: [...requestLifecycleStates],
    checks: {
      liveness: {
        status: 'ok' as const,
        detail: 'The API process is running and accepting requests.',
      },
      readiness: {
        status: 'ok' as const,
        detail: 'The API and its required dependencies are ready.',
      },
      database: {
        status: 'ok' as const,
        detail: 'Database connection is ready.',
      },
    },
  }),
};

export const referenceDataOpenApiExamples = {
  issueTypesResponse: buildSuccessEnvelopeExample([...supportedIssueTypes]),
  intakeQuestionSetResponse: buildSuccessEnvelopeExample({
    issueTypeId: 'slow-drain',
    title: 'A few quick questions about the slow drain',
    questions: [
      {
        id: 'singleDrainAffected',
        issueTypeId: 'slow-drain',
        prompt: 'Is only one drain running slowly?',
        helperText:
          'This helps us understand if the blockage is likely isolated.',
        responseType: 'boolean' as const,
        required: true as const,
      },
      {
        id: 'standingWater',
        issueTypeId: 'slow-drain',
        prompt: 'Is there standing water in the fixture right now?',
        responseType: 'boolean' as const,
        required: true as const,
      },
    ],
  }),
  containmentGuidanceQuery: {
    serviceabilityStatus: 'serviceable',
    nextStep: 'continueToContainment',
  },
  containmentGuidanceResponse: buildSuccessEnvelopeExample(
    containmentGuidanceExample,
  ),
  issueTypeError: createErrorResponse({
    code: 'REFERENCE_DATA_ISSUE_TYPE_INVALID',
    message: 'That issue type is not supported right now.',
    recoveryHint: 'Choose one of the supported plumbing issues and try again.',
  }),
  requestError: createErrorResponse({
    code: 'REFERENCE_DATA_REQUEST_INVALID',
    message: 'We could not resolve that reference-data request.',
    recoveryHint:
      'Check the request details and retry with a supported issue type or classification.',
  }),
};

export const requestsOpenApiExamples = {
  intakeEvaluation: {
    requestBody: {
      issueTypeId: 'slow-drain',
      answers: intakeAnswersExample,
      serviceLocation: serviceLocationExample,
    },
    successResponse: buildSuccessEnvelopeExample(classificationExample),
    validationError: createErrorResponse({
      code: 'REQUEST_INTAKE_EVALUATION_VALIDATION_FAILED',
      message: 'Unable to evaluate intake details.',
      recoveryHint:
        'Review the issue answers and address details, then try again.',
    }),
  },
  reviewSummary: {
    requestBody: {
      issueTypeId: 'slow-drain',
      answers: intakeAnswersExample,
      serviceLocation: serviceLocationExample,
      classification: classificationExample,
    },
    successResponse: buildSuccessEnvelopeExample(requestReviewSummaryExample),
    validationError: createErrorResponse({
      code: 'REQUEST_REVIEW_SUMMARY_VALIDATION_FAILED',
      message: 'Unable to create the request review summary.',
      recoveryHint: 'Review the request details and try again.',
    }),
    rejectedError: createErrorResponse({
      code: 'REQUEST_REVIEW_SUMMARY_REJECTED',
      message: 'Unable to create the request review summary for this request.',
      recoveryHint:
        'Return to the intake flow and refresh the request details.',
    }),
  },
  createRequest: {
    requestBody: {
      issueTypeId: 'slow-drain',
      answers: intakeAnswersExample,
      serviceLocation: serviceLocationExample,
      classification: classificationExample,
      idempotencyKey: 'openapi-create-request-demo',
      shownContainmentGuidance: containmentGuidanceExample,
      shownRequestReviewSummary: requestReviewSummaryExample,
    },
    successResponse: buildSuccessEnvelopeExample({
      publicId: swaggerPublicIdExample,
      issueTypeId: 'slow-drain',
      issueLabel: 'Slow drain',
      createdAt: swaggerGeneratedAtExample,
      confirmationHeadline: 'Your request is in review.',
      confirmationDetail:
        'Handrix received the request and is preparing the next update.',
      nextStepDetail:
        'Handrix is reviewing your request details and service location before the next update.',
      trackingCredential: {
        token: 'tracking.header.payload.signature',
        expiresAt: '2026-04-29T08:00:00.000Z',
      },
      ...receivedPublicStatusExample,
    }),
    validationError: createErrorResponse({
      code: 'REQUEST_VALIDATION_FAILED',
      message: 'We could not confirm this request yet.',
      recoveryHint: 'Please review the request details and try again.',
    }),
    rejectedError: createErrorResponse({
      code: 'REQUEST_CONFIRMATION_REJECTED',
      message: 'We could not confirm this request yet.',
      recoveryHint:
        'Please review the latest request details before trying again.',
    }),
    unavailableError: createErrorResponse({
      code: 'REQUEST_CONFIRMATION_UNAVAILABLE',
      message: 'We could not confirm the request right now.',
      recoveryHint:
        'Please try again in a moment using the same reviewed details.',
    }),
  },
  requestStatusLookup: {
    requestBody: {
      publicId: swaggerPublicIdExample,
      trackingToken: 'tracking.header.payload.signature',
    },
    successResponse: buildSuccessEnvelopeExample({
      publicId: swaggerPublicIdExample,
      issueLabel: 'Slow drain',
      createdAt: swaggerGeneratedAtExample,
      updatedAt: swaggerOccurredAtExample,
      nextStepDetail:
        'Handrix is reviewing your request details and service location before the next update.',
      latestChangeSummary:
        'Customer confirmed the anonymous request through the guided review flow.',
      history: [
        {
          previousPublicStatus: null,
          happenedAt: swaggerGeneratedAtExample,
          changeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
          nextStepDetail:
            'Handrix is reviewing your request details and service location before the next update.',
          recoveryState: null,
          ...receivedPublicStatusExample,
        },
      ],
      timeline: [
        {
          happenedAt: swaggerGeneratedAtExample,
          isCurrent: true,
          changeSummary:
            'Customer confirmed the anonymous request through the guided review flow.',
          ...receivedPublicStatusExample,
        },
      ],
      recoveryState: delayedRecoveryStateExample,
      ...receivedPublicStatusExample,
    }),
    validationError: createErrorResponse({
      code: 'REQUEST_STATUS_LOOKUP_VALIDATION_FAILED',
      message: 'We could not open that request status yet.',
      recoveryHint:
        'Please return using the latest request confirmation details and try again.',
    }),
    rejectedError: createErrorResponse({
      code: 'REQUEST_STATUS_LOOKUP_REJECTED',
      message: 'We could not open that request status right now.',
      recoveryHint:
        'Please return using the latest request confirmation details or start a new request if needed.',
    }),
    unavailableError: createErrorResponse({
      code: 'REQUEST_STATUS_LOOKUP_UNAVAILABLE',
      message: 'We could not open that request status right now.',
      recoveryHint:
        'Please try again in a moment using the same confirmation details.',
    }),
  },
};

export const opsOpenApiExamples = {
  pathParams: {
    publicId: swaggerPublicIdExample,
  },
  sessionResponse: buildSuccessEnvelopeExample({
    scope: 'ops' as const,
    message: 'Operations access granted.',
    user: {
      id: 'ops-default-user',
      email: 'ops@handrix.local',
      displayName: 'Operations Coordinator',
      role: 'ops' as const,
    },
  }),
  queueResponse: buildSuccessEnvelopeExample({
    items: [
      {
        publicId: swaggerPublicIdExample,
        issueLabel: 'Slow drain',
        addressSummary: '15 Spring Street, New York',
        queueState: 'new' as const,
        queueStateLabel: 'New request',
        queueStateDetail: 'Needs first-pass operations review.',
        urgencyCue: 'New intake',
        assignmentStatus: 'unassigned' as const,
        assignmentStatusLabel: 'Unassigned',
        intervention: null,
        receivedAt: swaggerGeneratedAtExample,
        updatedAt: swaggerOccurredAtExample,
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
    refreshedAt: swaggerOccurredAtExample,
  }),
  requestDetailResponse: buildSuccessEnvelopeExample({
    publicId: swaggerPublicIdExample,
    issueTypeId: 'slow-drain',
    issueLabel: 'Slow drain',
    createdAt: swaggerGeneratedAtExample,
    serviceLocation: serviceLocationExample,
    classification: classificationExample,
    currentState: {
      lifecycleState: 'dispatch_in_progress' as const,
      lifecycleStateLabel: 'Dispatch in progress',
      lifecycleStateDetail:
        'The request is moving through dispatch after review.',
      ...dispatchingPublicStatusExample,
    },
    serviceability: {
      serviceabilityStatus: 'serviceable' as const,
      serviceabilityLabel: 'Serviceable',
      classificationHeadline: classificationExample.summaryHeadline,
      classificationDetail: classificationExample.summaryDetail,
      scopeDecisionLabel: 'Within supported plumbing scope',
      scopeDecisionDetail:
        'The issue details stay inside the current MVP plumbing coverage.',
      coverageDecisionLabel: 'Inside active service area',
      coverageDecisionDetail:
        'The service address is inside the current operating area.',
      dispatchReadiness: 'dispatchInProgress' as const,
      dispatchReadinessLabel: 'Dispatch in progress',
      dispatchReadinessDetail:
        'A fulfillment path is already active and should stay aligned with customer updates.',
    },
    intakeAnswers: intakeAnswersOpsDetailExample,
    customerContext: {
      containmentGuidance: containmentGuidanceExample,
      requestReviewSummary: requestReviewSummaryExample,
    },
    assignment: {
      currentAssignment: {
        ownerType: 'provider' as const,
        ownerTypeLabel: 'Provider' as const,
        ownerId: 'provider_northstar',
        ownerLabel: 'Northstar Plumbing Co.',
        assignedAt: swaggerOccurredAtExample,
        note: 'Closest partner for this ZIP code.',
      },
      availableOwners: [
        {
          ownerType: 'provider' as const,
          ownerTypeLabel: 'Provider' as const,
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
    availableTransitions: [
      {
        nextLifecycleState: 'dispatch_delayed' as const,
        actionLabel: 'Mark as delayed',
        actionDetail:
          'Record that a blocker is slowing dispatch and refresh the customer-facing status.',
        nextLifecycleStateLabel: 'Dispatch delayed',
        nextLifecycleStateDetail:
          'A blocker is slowing fulfillment and may require intervention.',
        publicStatus: 'delayed' as const,
        publicStatusLabel: 'Dispatch delayed',
        publicStatusDetail:
          'This request is still active, but the expected progress timing has changed and the next update should explain the revised expectation clearly.',
      },
    ],
    history: [
      {
        previousLifecycleState: 'intake_in_review' as const,
        nextLifecycleState: 'dispatch_in_progress' as const,
        previousPublicStatus: 'inReview' as const,
        nextPublicStatus: 'dispatching' as const,
        occurredAt: swaggerOccurredAtExample,
        actorType: 'ops' as const,
        actorId: 'ops-default-user',
        changeSummary:
          'Operations assigned Northstar Plumbing Co. and moved the request into dispatch.',
        intervention: null,
        customerSnapshot: customerSnapshotDispatchingExample,
      },
    ],
  }),
  assignRequestBody: {
    ownerId: 'provider_northstar',
    note: 'Closest partner for this ZIP code.',
  },
  updateStatusBody: {
    nextLifecycleState: 'dispatch_delayed',
    note: 'Arrival timing is taking longer than first expected.',
  },
  validationError: createErrorResponse({
    code: 'OPS_STATUS_UPDATE_VALIDATION_FAILED',
    message: 'We could not apply that lifecycle update.',
    recoveryHint: 'Choose one of the available next statuses and try again.',
  }),
  notFoundError: createErrorResponse({
    code: 'OPS_REQUEST_NOT_FOUND',
    message: 'We could not open that operations request right now.',
    recoveryHint: 'Return to the queue and choose an active request again.',
  }),
};

export const supportOpenApiExamples = {
  pathParams: {
    publicId: swaggerPublicIdExample,
  },
  sessionResponse: buildSuccessEnvelopeExample({
    scope: 'support' as const,
    message: 'Support access granted.',
    user: {
      id: 'support-default-user',
      email: 'support@handrix.local',
      displayName: 'Support Coordinator',
      role: 'support' as const,
    },
  }),
  searchQuery: {
    q: swaggerPublicIdExample,
    limit: 10,
  },
  searchResponse: buildSuccessEnvelopeExample({
    items: [
      {
        publicId: swaggerPublicIdExample,
        issueLabel: 'Slow drain',
        addressSummary: '15 Spring Street, New York',
        currentPublicStatusLabel: 'Request received',
        currentPublicStatusDetail:
          receivedPublicStatusExample.publicStatusDetail,
        currentInternalLifecycleLabel: 'Intake in review',
        currentInternalLifecycleDetail:
          'Operations is still reviewing the intake details before assignment.',
        receivedAt: swaggerGeneratedAtExample,
        lastUpdatedAt: swaggerOccurredAtExample,
        latestChangeSummary:
          'Customer confirmed the anonymous request through the guided review flow.',
        currentAssignmentOwnerLabel: null,
        interventionLabel: null,
      },
    ],
    summary: { totalMatched: 1, limitReached: false },
    refreshedAt: swaggerOccurredAtExample,
    query: {
      q: swaggerPublicIdExample,
      normalizedQ: swaggerPublicIdExample,
      limit: 10,
    },
  }),
  requestDetailResponse: buildSuccessEnvelopeExample({
    publicId: swaggerPublicIdExample,
    issueTypeId: 'slow-drain',
    issueLabel: 'Slow drain',
    createdAt: swaggerGeneratedAtExample,
    serviceLocation: serviceLocationExample,
    currentState: {
      lifecycleState: 'intake_in_review' as const,
      lifecycleStateLabel: 'Intake in review',
      lifecycleStateDetail:
        'Operations is still reviewing the intake details before assignment.',
      ...receivedPublicStatusExample,
    },
    classification: classificationExample,
    intakeAnswers: intakeAnswersDetailExample,
    customerContext: {
      containmentGuidance: containmentGuidanceExample,
      requestReviewSummary: requestReviewSummaryExample,
    },
    assignment: {
      ownerType: 'provider' as const,
      ownerTypeLabel: 'Provider',
      ownerLabel: 'Northstar Plumbing Co.',
      assignedAt: swaggerOccurredAtExample,
      note: 'Closest partner for this ZIP code.',
    },
    intervention: null,
    explanation: {
      kind: 'delay' as const,
      label: 'Dispatch delay',
      detail: 'A fulfillment blocker is slowing the next step.',
      reasonDetail:
        'The current routing partner is delayed, so a revised expectation is being prepared.',
      expectationUpdate: 'A revised timing update is in progress.',
      nextActionLabel: 'Wait for the next update',
      nextActionDetail:
        'Handrix will share the next dispatch update as soon as routing is rechecked.',
      customerVisibleRecovery: delayedRecoveryStateExample,
      latestRelevantChange: {
        occurredAt: swaggerOccurredAtExample,
        actorType: 'ops' as const,
        changeSummary: 'Operations recorded a dispatch delay.',
      },
    },
    latestSupportFollowUp: {
      kind: 'blocker' as const,
      label: 'Blocker noted',
      detail: 'Support recorded a protected follow-up for the current blocker.',
      recordedAt: swaggerOccurredAtExample,
      actorType: 'support' as const,
      visibility: 'internal' as const,
      visibilityLabel: 'Internal only',
      affectsLifecycle: true,
    },
    history: [
      {
        previousLifecycleState: null,
        nextLifecycleState: 'intake_in_review' as const,
        previousLifecycleStateLabel: null,
        nextLifecycleStateLabel: 'Intake in review',
        previousPublicStatus: null,
        nextPublicStatus: 'received' as const,
        previousPublicStatusLabel: null,
        nextPublicStatusLabel: 'Request received',
        occurredAt: swaggerGeneratedAtExample,
        actorType: 'customer' as const,
        changeSummary:
          'Customer confirmed the anonymous request through the guided review flow.',
        visibility: 'customer' as const,
        visibilityLabel: 'Customer visible',
        intervention: null,
        customerSnapshot: customerSnapshotReceivedExample,
      },
    ],
    latestChangeSummary:
      'Customer confirmed the anonymous request through the guided review flow.',
    lastUpdatedAt: swaggerOccurredAtExample,
  }),
  interventionRequestBody: {
    kind: 'blocker',
    note: 'Shared the revised expectation and confirmed the customer can wait.',
    updateLifecycle: true,
  },
  validationError: createErrorResponse({
    code: 'SUPPORT_INTERVENTION_VALIDATION_FAILED',
    message: 'We could not record that support follow-up.',
    recoveryHint: 'Choose a follow-up type, add a short note, and try again.',
  }),
  searchValidationError: createErrorResponse({
    code: 'SUPPORT_SEARCH_QUERY_INVALID',
    message: 'We could not run that search.',
    recoveryHint: 'Try a shorter search term or remove special characters.',
  }),
  notFoundError: createErrorResponse({
    code: 'SUPPORT_REQUEST_NOT_FOUND',
    message: 'We could not open that request right now.',
    recoveryHint: 'Return to search and choose a request again.',
  }),
};
