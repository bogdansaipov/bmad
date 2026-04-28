import {
  OBSERVABILITY_EVENT_NAMES,
  type ClarifyingAnswer,
  type CreateRequestRequest,
  type CreateRequestResponse,
  type IssueTypeId,
  type PublicRequestStatus,
  type PublicObservabilityEventIngestionRequest,
  type RequestReviewRequest,
  type RequestReviewSummary,
  type RequestStatusLookupRequest,
  type RequestStatusResponse,
  type IntakeClassification,
  type ServiceLocation,
  type SubmitFeedbackDto,
  type SubmitFeedbackResponse,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import {
  issueRequestTrackingCredential,
  validateRequestTrackingCredential,
} from './request-tracking-credential';
import {
  RequestStoreService,
  createPersistedHistoryEntry,
  type PersistedRequestHistoryEntry,
  type PersistedServiceRequest,
  type RequestLifecycleState,
} from './request-store.service';
import { resolvePublicRequestStatusPresentation } from './request-status.presenter';
import { buildRequestStatusResponse } from './request-status-timeline.presenter';
import { ObservabilityService } from '../../common/observability/observability.service';

type AnswerMap = Record<string, ClarifyingAnswer['value']>;

export class RequestFeedbackError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly recoveryHint: string,
    readonly status: 'badRequest' | 'notFound' | 'conflict' = 'badRequest',
  ) {
    super(message);
    this.name = 'RequestFeedbackError';
  }
}

const FLOW_STARTED_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RequestsService {
  constructor(
    private readonly referenceDataService: ReferenceDataService,
    private readonly requestStoreService: RequestStoreService,
    private readonly prismaService: PrismaService,
    private readonly observabilityService: ObservabilityService = new ObservabilityService(),
  ) {}

  evaluateIntake(
    issueTypeId: IssueTypeId,
    answers: ClarifyingAnswer[],
    serviceLocation: ServiceLocation,
  ): IntakeClassification {
    const issueType = this.referenceDataService.getIssueType(issueTypeId);

    if (issueType !== null) {
      void this.observabilityService.recordEvent({
        eventName: OBSERVABILITY_EVENT_NAMES.issueSelected,
        routeScope: 'requests',
        actorType: 'customer',
        outcome: 'success',
        metadata: {
          issueTypeId,
          issueLabel: issueType.label,
        },
      });
    }

    const classification = this.referenceDataService.evaluateIntakeDecision(
      issueTypeId,
      answers,
      serviceLocation,
    ).classification;

    void this.observabilityService.recordEvent({
      eventName: OBSERVABILITY_EVENT_NAMES.requestIntakeEvaluated,
      routeScope: 'requests',
      actorType: 'customer',
      outcome: 'success',
      metadata: {
        issueTypeId,
        serviceabilityStatus: classification.serviceabilityStatus,
        nextStep: classification.nextStep,
      },
    });

    return classification;
  }

  createRequestReviewSummary(
    request: RequestReviewRequest,
  ): RequestReviewSummary | null {
    if (request.classification.nextStep !== 'continueToContainment') {
      void this.observabilityService.recordEvent({
        eventName: 'request.review.summary.rejected',
        routeScope: 'requests',
        actorType: 'customer',
        outcome: 'rejected',
        metadata: {
          issueTypeId: request.issueTypeId,
          nextStep: request.classification.nextStep,
        },
      });
      return null;
    }

    const issueType = this.referenceDataService.getIssueType(
      request.issueTypeId,
    );
    const questionSet = this.referenceDataService.getIntakeQuestionSet(
      request.issueTypeId,
    );
    const reviewTemplate = this.referenceDataService.getRequestReviewTemplate(
      request.issueTypeId,
    );

    if (!issueType || !questionSet || !reviewTemplate) {
      void this.observabilityService.recordEvent({
        eventName: 'request.review.summary.rejected',
        routeScope: 'requests',
        actorType: 'customer',
        outcome: 'rejected',
        metadata: {
          issueTypeId: request.issueTypeId,
          reason: 'missing-reference-data',
        },
      });
      return null;
    }

    const answerMap = this.toAnswerMap(request.answers);

    const summary: RequestReviewSummary = {
      issueTypeId: request.issueTypeId,
      issueLabel: issueType.label,
      headline: 'Review the request details before you confirm.',
      intro:
        'This is a quick final check of what we will submit, what timing usually looks like, and how pricing is handled before any additional work is approved.',
      sections: [
        {
          title: 'Issue details',
          editTarget: 'issueDetails',
          editLabel: 'Edit issue details',
          items: [
            {
              label: 'Selected issue',
              value: issueType.label,
            },
            ...questionSet.questions.map((question) => ({
              label: question.prompt,
              value: this.formatAnswerValue(answerMap[question.id]),
            })),
          ],
        },
        {
          title: 'Service location',
          editTarget: 'serviceLocation',
          editLabel: 'Edit service location',
          items: [
            {
              label: 'Street address',
              value: request.serviceLocation.addressLine1,
            },
            ...(request.serviceLocation.unitOrAccessNote
              ? [
                  {
                    label: 'Unit or access note',
                    value: request.serviceLocation.unitOrAccessNote,
                  },
                ]
              : []),
            {
              label: 'City',
              value: request.serviceLocation.city,
            },
            {
              label: 'ZIP code',
              value: request.serviceLocation.postalCode,
            },
            ...(request.serviceLocation.locationDetails
              ? [
                  {
                    label: 'Location details',
                    value: request.serviceLocation.locationDetails,
                  },
                ]
              : []),
          ],
        },
      ],
      eta: reviewTemplate.eta,
      pricing: reviewTemplate.pricing,
      nextSteps: reviewTemplate.nextSteps,
      confirmationLabel: 'Confirm request',
      confirmationHint:
        'You can still go back to edit the details above before you confirm.',
    };

    void this.observabilityService.recordEvent({
      eventName: 'request.review.summary.generated',
      routeScope: 'requests',
      actorType: 'customer',
      outcome: 'success',
      metadata: {
        issueTypeId: request.issueTypeId,
        issueLabel: issueType.label,
      },
    });

    return summary;
  }

  async createAnonymousRequest(
    request: CreateRequestRequest,
  ): Promise<CreateRequestResponse> {
    if (request.classification.nextStep !== 'continueToContainment') {
      throw new Error('This request is not ready for confirmation yet.');
    }

    const issueType = this.referenceDataService.getIssueType(
      request.issueTypeId,
    );

    if (!issueType) {
      throw new Error(
        'We could not match this issue type for request creation.',
      );
    }

    const createdAt = new Date().toISOString();
    const lifecycleState: RequestLifecycleState = 'intake_in_review';
    const publicStatus: PublicRequestStatus = 'received';
    const publicId = this.createPublicId();
    const requestFingerprint = this.createRequestFingerprint(request);
    const trackingCredential = this.createTrackingCredential(
      publicId,
      createdAt,
    );
    const historyEntry: PersistedRequestHistoryEntry =
      createPersistedHistoryEntry({
        previousLifecycleState: null,
        nextLifecycleState: lifecycleState,
        previousPublicStatus: null,
        nextPublicStatus: publicStatus,
        occurredAt: createdAt,
        changeSummary:
          'Customer confirmed the anonymous request through the guided review flow.',
      });

    const persistedRequest: PersistedServiceRequest = {
      internalId: randomUUID(),
      publicId,
      idempotencyKey: request.idempotencyKey,
      requestFingerprint,
      issueTypeId: request.issueTypeId,
      issueLabel: issueType.label,
      answers: request.answers,
      serviceLocation: request.serviceLocation,
      classification: request.classification,
      lifecycleState,
      publicStatus,
      createdAt,
      trackingCredential,
      customerContext: {
        shownContainmentGuidance: request.shownContainmentGuidance,
        shownRequestReviewSummary: request.shownRequestReviewSummary,
      },
      history: [historyEntry],
    };

    const result =
      await this.requestStoreService.createOrGetByIdempotencyKey(
        persistedRequest,
      );

    this.observabilityService.annotateRequest({
      actorType: 'customer',
      publicId: result.record.publicId,
    });
    await this.observabilityService.recordEvent({
      eventName: OBSERVABILITY_EVENT_NAMES.requestConfirmed,
      routeScope: 'requests',
      actorType: 'customer',
      publicId: result.record.publicId,
      lifecycleState: result.record.lifecycleState,
      publicStatus: result.record.publicStatus,
      outcome: result.kind === 'created' ? 'success' : 'existing',
      occurredAt: result.record.createdAt,
      metadata: {
        issueTypeId: result.record.issueTypeId,
        issueLabel: result.record.issueLabel,
        serviceabilityStatus: result.record.classification.serviceabilityStatus,
      },
    });

    return this.toCreateRequestResponse(result.record);
  }

  async getRequestStatus(
    request: RequestStatusLookupRequest,
  ): Promise<RequestStatusResponse> {
    const persistedRequest = await this.requestStoreService.getByPublicId(
      request.publicId,
    );

    if (!persistedRequest) {
      throw new Error('This request status is not available right now.');
    }

    try {
      validateRequestTrackingCredential({
        publicId: request.publicId,
        token: request.trackingToken,
      });
    } catch {
      throw new Error('This request status is not available right now.');
    }

    this.observabilityService.annotateRequest({
      actorType: 'customer',
      publicId: persistedRequest.publicId,
    });
    await this.observabilityService.recordEvent({
      eventName: OBSERVABILITY_EVENT_NAMES.requestStatusLookedUp,
      routeScope: 'requests',
      actorType: 'customer',
      publicId: persistedRequest.publicId,
      lifecycleState: persistedRequest.lifecycleState,
      publicStatus: persistedRequest.publicStatus,
      outcome: 'success',
      metadata: {
        issueTypeId: persistedRequest.issueTypeId,
      },
    });

    return this.toRequestStatusResponse(persistedRequest);
  }

  async recordPublicIngestedEvent(
    input: PublicObservabilityEventIngestionRequest,
  ): Promise<void> {
    if (
      input.eventName === OBSERVABILITY_EVENT_NAMES.flowStarted &&
      input.sessionId
    ) {
      const sinceWindow = new Date(Date.now() - FLOW_STARTED_DEDUP_WINDOW_MS);
      const existing = await this.prismaService.observabilityEvent.findFirst({
        where: {
          eventName: OBSERVABILITY_EVENT_NAMES.flowStarted,
          occurredAt: { gte: sinceWindow },
          metadata: {
            path: ['sessionId'],
            equals: input.sessionId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        return;
      }
    }

    const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };
    if (input.sessionId) {
      metadata.sessionId = input.sessionId;
    }

    await this.observabilityService.recordEvent({
      eventName: input.eventName,
      routeScope: 'requests',
      actorType: 'customer',
      outcome: 'success',
      metadata,
    });
  }

  async submitFeedback(input: {
    publicId: string;
    trackingToken: string;
    feedback: SubmitFeedbackDto;
  }): Promise<SubmitFeedbackResponse> {
    try {
      validateRequestTrackingCredential({
        publicId: input.publicId,
        token: input.trackingToken,
      });
    } catch {
      throw new RequestFeedbackError(
        'REQUEST_FEEDBACK_UNAUTHORIZED',
        'We could not record that feedback.',
        'Return to the tracking view and try again using the latest tracking identity.',
      );
    }

    const persistedRequest = await this.requestStoreService.getByPublicId(
      input.publicId,
    );

    if (persistedRequest === null) {
      throw new RequestFeedbackError(
        'REQUEST_FEEDBACK_UNAUTHORIZED',
        'We could not record that feedback.',
        'Return to the tracking view and try again using the latest tracking identity.',
      );
    }

    if (
      persistedRequest.lifecycleState !== 'completed' &&
      persistedRequest.lifecycleState !== 'unfulfilled'
    ) {
      throw new RequestFeedbackError(
        'REQUEST_FEEDBACK_NOT_READY',
        'Feedback is only accepted after the request is resolved.',
        'Wait for the request to finish fulfillment before sharing feedback.',
      );
    }

    const recordedAt = new Date();

    try {
      await this.prismaService.requestFeedback.create({
        data: {
          id: randomUUID(),
          requestId: persistedRequest.internalId,
          satisfactionRating: input.feedback.satisfactionRating,
          reducedUncertainty: input.feedback.reducedUncertainty ?? null,
          freeText: input.feedback.freeText ?? null,
          recordedAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new RequestFeedbackError(
          'REQUEST_FEEDBACK_ALREADY_SUBMITTED',
          'Feedback has already been recorded for this request.',
          'Each request accepts feedback once — no further action is needed.',
          'conflict',
        );
      }

      throw error;
    }

    this.observabilityService.annotateRequest({
      actorType: 'customer',
      publicId: persistedRequest.publicId,
    });
    await this.observabilityService.recordEvent({
      eventName: OBSERVABILITY_EVENT_NAMES.fulfillmentOutcomeRecorded,
      routeScope: 'requests',
      actorType: 'customer',
      publicId: persistedRequest.publicId,
      lifecycleState: persistedRequest.lifecycleState,
      publicStatus: persistedRequest.publicStatus,
      outcome: 'success',
      metadata: {
        satisfactionRating: input.feedback.satisfactionRating,
        reducedUncertainty: input.feedback.reducedUncertainty ?? null,
      },
    });

    return {
      recordedAt: recordedAt.toISOString(),
      satisfactionRating: input.feedback.satisfactionRating,
      acknowledgement: 'Thank you for sharing feedback on your request.',
    };
  }

  private toAnswerMap(answers: ClarifyingAnswer[]): AnswerMap {
    return answers.reduce<AnswerMap>((accumulator, answer) => {
      accumulator[answer.questionId] = answer.value;
      return accumulator;
    }, {});
  }

  private formatAnswerValue(value: ClarifyingAnswer['value'] | undefined) {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return typeof value === 'string' && value.trim().length > 0
      ? value
      : 'Not provided';
  }
  private createPublicId() {
    return `hrx_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  }

  private createRequestFingerprint(request: CreateRequestRequest) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          issueTypeId: request.issueTypeId,
          answers: request.answers,
          serviceLocation: request.serviceLocation,
          classification: request.classification,
        }),
      )
      .digest('hex');
  }

  private toCreateRequestResponse(
    persistedRequest: PersistedServiceRequest,
  ): CreateRequestResponse {
    const publicStatusPresentation = resolvePublicRequestStatusPresentation({
      lifecycleState: persistedRequest.lifecycleState,
      publicStatus: persistedRequest.publicStatus,
    });

    return {
      publicId: persistedRequest.publicId,
      issueTypeId: persistedRequest.issueTypeId,
      issueLabel: persistedRequest.issueLabel,
      publicStatus: persistedRequest.publicStatus,
      publicStatusLabel: publicStatusPresentation.publicStatusLabel,
      publicStatusDetail: publicStatusPresentation.publicStatusDetail,
      createdAt: persistedRequest.createdAt,
      confirmationHeadline: 'Your request has been received.',
      confirmationDetail:
        'Handrix has your issue details and service location, and the request is now in the intake review queue.',
      nextStepDetail:
        'You can come back to track this request later without creating an account.',
      trackingCredential: persistedRequest.trackingCredential,
    };
  }

  private createTrackingCredential(publicId: string, issuedAt: string) {
    return issueRequestTrackingCredential(publicId, issuedAt);
  }

  private toRequestStatusResponse(
    persistedRequest: PersistedServiceRequest,
  ): RequestStatusResponse {
    return buildRequestStatusResponse(persistedRequest);
  }
}
