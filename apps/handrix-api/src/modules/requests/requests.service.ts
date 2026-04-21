import {
  type ClarifyingAnswer,
  type CreateRequestRequest,
  type CreateRequestResponse,
  type IssueTypeId,
  type PublicRequestStatus,
  type RequestReviewRequest,
  type RequestReviewSummary,
  type RequestStatusLookupRequest,
  type RequestStatusResponse,
  type IntakeClassification,
  type ServiceLocation,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
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

type AnswerMap = Record<string, ClarifyingAnswer['value']>;

@Injectable()
export class RequestsService {
  constructor(
    private readonly referenceDataService: ReferenceDataService,
    private readonly requestStoreService: RequestStoreService,
  ) {}

  evaluateIntake(
    issueTypeId: IssueTypeId,
    answers: ClarifyingAnswer[],
    serviceLocation: ServiceLocation,
  ): IntakeClassification {
    return this.referenceDataService.evaluateIntakeDecision(
      issueTypeId,
      answers,
      serviceLocation,
    ).classification;
  }

  createRequestReviewSummary(
    request: RequestReviewRequest,
  ): RequestReviewSummary | null {
    if (request.classification.nextStep !== 'continueToContainment') {
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
      return null;
    }

    const answerMap = this.toAnswerMap(request.answers);

    return {
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
        expectedToken: persistedRequest.trackingCredential.token,
      });
    } catch {
      throw new Error('This request status is not available right now.');
    }

    return this.toRequestStatusResponse(persistedRequest);
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
