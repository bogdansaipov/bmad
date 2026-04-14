import {
  type ClarifyingAnswer,
  type CreateRequestRequest,
  type CreateRequestResponse,
  type IntakeClassification,
  type IssueTypeId,
  type PublicRequestStatus,
  type RequestReviewRequest,
  type RequestReviewSummary,
  type RequestTrackingCredential,
  type ServiceLocation,
  supportedServiceAreaPostalCodes,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import {
  RequestStoreService,
  type PersistedRequestHistoryEntry,
  type PersistedServiceRequest,
  type RequestLifecycleState,
} from './request-store.service';

type AnswerMap = Record<string, ClarifyingAnswer['value']>;
const TRACKING_TOKEN_SECRET =
  process.env.HANDRIX_REQUEST_TOKEN_SECRET?.trim() ||
  'handrix-local-tracking-secret';

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
    const questionSet =
      this.referenceDataService.getIntakeQuestionSet(issueTypeId);

    if (questionSet === null) {
      return {
        issueTypeId,
        serviceabilityStatus: 'needsRecovery',
        nextStep: 'showRecoveryPath',
        summaryHeadline: 'We need a different support path for this request.',
        summaryDetail:
          'This issue type is not available through the current intake flow right now.',
        recoveryCode: 'UNSUPPORTED_REQUEST_DETAILS',
      };
    }

    const answerMap = this.toAnswerMap(answers);
    const outsideSupportedScope = this.isOutsideSupportedScope(
      issueTypeId,
      answerMap,
    );
    const outsideServiceArea = !supportedServiceAreaPostalCodes.includes(
      serviceLocation.postalCode as (typeof supportedServiceAreaPostalCodes)[number],
    );

    if (outsideSupportedScope) {
      return {
        issueTypeId,
        serviceabilityStatus: 'needsRecovery',
        nextStep: 'showRecoveryPath',
        summaryHeadline:
          'This request needs a recovery path instead of the standard flow.',
        summaryDetail:
          'Based on the details you shared, this looks broader than the small-plumbing cases Handrix handles in the MVP.',
        recoveryCode: 'UNSUPPORTED_REQUEST_DETAILS',
      };
    }

    if (outsideServiceArea) {
      return {
        issueTypeId,
        serviceabilityStatus: 'outOfArea',
        nextStep: 'showRecoveryPath',
        summaryHeadline:
          'This address is outside the current Handrix service area.',
        summaryDetail:
          'We can still guide you toward the recovery path, but we should not continue through the normal booking flow.',
        recoveryCode: 'OUT_OF_SERVICE_AREA',
      };
    }

    return {
      issueTypeId,
      serviceabilityStatus: 'serviceable',
      nextStep: 'continueToContainment',
      summaryHeadline: 'This request can keep moving through the guided flow.',
      summaryDetail:
        'You are still within the supported plumbing scope and service area for the next Handrix step.',
    };
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
    const historyEntry: PersistedRequestHistoryEntry = {
      lifecycleState,
      publicStatus,
      createdAt,
      note: 'Customer confirmed the anonymous request through the guided review flow.',
    };

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
      history: [historyEntry],
    };

    const result =
      await this.requestStoreService.createOrGetByIdempotencyKey(
        persistedRequest,
      );

    return this.toCreateRequestResponse(result.record);
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

  private isOutsideSupportedScope(
    issueTypeId: IssueTypeId,
    answers: AnswerMap,
  ) {
    const scopeRules: Partial<
      Record<IssueTypeId, (answerMap: AnswerMap) => boolean>
    > = {
      'dripping-faucet': (answerMap) => answerMap.singleFixture === false,
      'under-sink-leak': (answerMap) => answerMap.containedToSink === false,
      'clogged-toilet': (answerMap) =>
        answerMap.singleToiletAffected === false ||
        answerMap.backupBeyondToilet === true,
      'slow-drain': (answerMap) => answerMap.singleDrainAffected === false,
      'shower-bath-leak': (answerMap) =>
        answerMap.containedToBathArea === false,
    };

    return scopeRules[issueTypeId]?.(answers) ?? false;
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

  private createTrackingCredential(
    publicId: string,
    issuedAt: string,
  ): RequestTrackingCredential {
    const expiresAt = new Date(
      new Date(issuedAt).getTime() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString();
    const payloadBase64 = Buffer.from(
      JSON.stringify({
        publicId,
        issuedAt,
        expiresAt,
        scope: 'request-status',
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', TRACKING_TOKEN_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    return {
      token: `${payloadBase64}.${signature}`,
      expiresAt,
    };
  }

  private toCreateRequestResponse(
    persistedRequest: PersistedServiceRequest,
  ): CreateRequestResponse {
    return {
      publicId: persistedRequest.publicId,
      issueTypeId: persistedRequest.issueTypeId,
      issueLabel: persistedRequest.issueLabel,
      lifecycleState: persistedRequest.lifecycleState,
      publicStatus: persistedRequest.publicStatus,
      createdAt: persistedRequest.createdAt,
      confirmationHeadline: 'Your request has been received.',
      confirmationDetail:
        'Handrix has your issue details and service location, and the request is now in the intake review queue.',
      nextStepDetail:
        'You can come back to track this request later without creating an account.',
      trackingCredential: persistedRequest.trackingCredential,
    };
  }
}
