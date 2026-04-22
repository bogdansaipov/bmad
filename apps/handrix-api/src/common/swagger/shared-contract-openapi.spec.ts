import {
  apiErrorResponseSchema,
  containmentGuidanceSchema,
  createRequestRequestSchema,
  createRequestResponseSchema,
  evaluateIntakeRequestSchema,
  healthPayloadSchema,
  intakeClassificationSchema,
  intakeQuestionSetSchema,
  internalAuthRequestSchema,
  internalSessionSchema,
  issueTypeListSchema,
  opsAssignRequestSchema,
  opsQueueResponseSchema,
  opsRequestDetailResponseSchema,
  opsUpdateRequestStatusSchema,
  requestLifecycleStates,
  requestReviewRequestSchema,
  requestReviewSummarySchema,
  requestStatusLookupRequestSchema,
  requestStatusResponseSchema,
  supportInterventionRequestSchema,
  supportRequestDetailResponseSchema,
  supportRequestSearchResponseSchema,
  supportSearchRequestQuerySchema,
} from '@handrix/shared-contracts';
import {
  authOpenApiExamples,
  healthOpenApiExamples,
  opsOpenApiExamples,
  referenceDataOpenApiExamples,
  requestsOpenApiExamples,
  supportOpenApiExamples,
} from './shared-contract-openapi';

function expectSuccessExample<TData>(
  schema: {
    safeParse: (
      input: unknown,
    ) => { success: true; data: TData } | { success: false };
  },
  example: unknown,
): TData {
  const envelope = example as {
    data: unknown;
    meta?: {
      generatedAt?: string;
    };
  };

  expect(typeof envelope.meta?.generatedAt).toBe('string');

  const parsed = schema.safeParse(envelope.data);

  expect(parsed.success).toBe(true);

  if (!parsed.success) {
    throw new Error(
      'Expected the shared contract example to parse successfully.',
    );
  }

  return parsed.data;
}

describe('shared contract OpenAPI examples', () => {
  it('keeps request lifecycle exports aligned with health payloads', () => {
    const parsedHealth = expectSuccessExample(
      healthPayloadSchema,
      healthOpenApiExamples.response,
    );

    expect(parsedHealth.supportedLifecycleStates).toEqual(
      requestLifecycleStates,
    );
  });

  it('keeps public request examples aligned with shared request schemas', () => {
    expect(
      evaluateIntakeRequestSchema.parse(
        requestsOpenApiExamples.intakeEvaluation.requestBody,
      ),
    ).toBeTruthy();
    expectSuccessExample(
      intakeClassificationSchema,
      requestsOpenApiExamples.intakeEvaluation.successResponse,
    );

    expect(
      requestReviewRequestSchema.parse(
        requestsOpenApiExamples.reviewSummary.requestBody,
      ),
    ).toBeTruthy();
    expectSuccessExample(
      requestReviewSummarySchema,
      requestsOpenApiExamples.reviewSummary.successResponse,
    );

    expect(
      createRequestRequestSchema.parse(
        requestsOpenApiExamples.createRequest.requestBody,
      ),
    ).toBeTruthy();
    expectSuccessExample(
      createRequestResponseSchema,
      requestsOpenApiExamples.createRequest.successResponse,
    );

    expect(
      requestStatusLookupRequestSchema.parse(
        requestsOpenApiExamples.requestStatusLookup.requestBody,
      ),
    ).toBeTruthy();
    expectSuccessExample(
      requestStatusResponseSchema,
      requestsOpenApiExamples.requestStatusLookup.successResponse,
    );
  });

  it('keeps auth, ops, and support examples aligned with protected contract schemas', () => {
    expect(
      internalAuthRequestSchema.parse(
        authOpenApiExamples.createInternalSession.requestBody,
      ),
    ).toBeTruthy();
    expectSuccessExample(
      internalSessionSchema,
      authOpenApiExamples.createInternalSession.successResponse,
    );

    expect(
      opsAssignRequestSchema.parse(opsOpenApiExamples.assignRequestBody),
    ).toBeTruthy();
    expect(
      opsUpdateRequestStatusSchema.parse(opsOpenApiExamples.updateStatusBody),
    ).toBeTruthy();
    expectSuccessExample(
      opsQueueResponseSchema,
      opsOpenApiExamples.queueResponse,
    );
    expectSuccessExample(
      opsRequestDetailResponseSchema,
      opsOpenApiExamples.requestDetailResponse,
    );

    expect(
      supportSearchRequestQuerySchema.parse(supportOpenApiExamples.searchQuery),
    ).toBeTruthy();
    expectSuccessExample(
      supportRequestSearchResponseSchema,
      supportOpenApiExamples.searchResponse,
    );
    expectSuccessExample(
      supportRequestDetailResponseSchema,
      supportOpenApiExamples.requestDetailResponse,
    );
    expect(
      supportInterventionRequestSchema.parse(
        supportOpenApiExamples.interventionRequestBody,
      ),
    ).toBeTruthy();
  });

  it('keeps reference-data examples aligned with shared schemas', () => {
    expectSuccessExample(
      issueTypeListSchema,
      referenceDataOpenApiExamples.issueTypesResponse,
    );
    expectSuccessExample(
      intakeQuestionSetSchema,
      referenceDataOpenApiExamples.intakeQuestionSetResponse,
    );
    expect(
      containmentGuidanceSchema.parse(
        referenceDataOpenApiExamples.containmentGuidanceResponse.data,
      ),
    ).toBeTruthy();
  });

  it('publishes only shared error envelope examples for documented failures', () => {
    const errorExamples = [
      authOpenApiExamples.createInternalSession.validationError,
      authOpenApiExamples.createInternalSession.rejectedError,
      authOpenApiExamples.protectedErrors.unauthorized,
      authOpenApiExamples.protectedErrors.forbidden,
      referenceDataOpenApiExamples.issueTypeError,
      referenceDataOpenApiExamples.requestError,
      requestsOpenApiExamples.intakeEvaluation.validationError,
      requestsOpenApiExamples.reviewSummary.validationError,
      requestsOpenApiExamples.reviewSummary.rejectedError,
      requestsOpenApiExamples.createRequest.validationError,
      requestsOpenApiExamples.createRequest.rejectedError,
      requestsOpenApiExamples.createRequest.unavailableError,
      requestsOpenApiExamples.requestStatusLookup.validationError,
      requestsOpenApiExamples.requestStatusLookup.rejectedError,
      requestsOpenApiExamples.requestStatusLookup.unavailableError,
      opsOpenApiExamples.validationError,
      opsOpenApiExamples.notFoundError,
      supportOpenApiExamples.validationError,
      supportOpenApiExamples.searchValidationError,
      supportOpenApiExamples.notFoundError,
    ];

    for (const example of errorExamples) {
      expect(apiErrorResponseSchema.parse(example)).toBeTruthy();
    }
  });
});
