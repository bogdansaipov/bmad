import type { z } from 'zod';
import type {
  containmentGuidanceRequestSchema,
  containmentGuidanceSchema,
  containmentGuidanceStepSchema,
  containmentGuidanceVariantSchema,
  containmentGuidanceWarningSchema,
} from './containment-guidance.schemas';
import type {
  requestReviewEditTargetSchema,
  requestReviewExpectationSchema,
  requestReviewNextStepSchema,
  requestReviewRequestSchema,
  requestReviewSectionSchema,
  requestReviewSummaryItemSchema,
  requestReviewSummarySchema,
} from './request-review.schemas';
import type {
  clarifyingAnswerListSchema,
  clarifyingAnswerSchema,
  clarifyingQuestionListSchema,
  clarifyingQuestionOptionSchema,
  clarifyingQuestionSchema,
  clarifyingQuestionResponseTypeSchema,
  evaluateIntakeRequestSchema,
  intakeClassificationSchema,
  intakeNextStepSchema,
  intakeQuestionSetSchema,
  recoveryCodeSchema,
  serviceabilityStatusSchema,
  serviceLocationSchema,
} from './intake.schemas';
import type {
  issueSelectionSchema,
  issueTypeIdSchema,
  issueTypeListSchema,
  issueTypeSchema,
} from './issue-types.schemas';
import type {
  createRequestRequestSchema,
  createRequestResponseSchema,
  requestApiErrorResponseSchema,
  requestApiErrorSchema,
} from './request.schemas';
import type {
  publicRequestStatusPresentationSchema,
  requestRecoveryStateKindSchema,
  requestRecoveryStateSchema,
  publicRequestStatusSchema,
  requestStatusLookupRequestSchema,
  requestStatusResponseSchema,
  requestStatusSchema,
  requestStatusTimelineEntrySchema,
  requestTrackingCredentialSchema,
} from './request-status.schemas';

export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type RequestStatusLookupRequest = z.infer<
  typeof requestStatusLookupRequestSchema
>;
export type RequestStatusResponse = z.infer<typeof requestStatusResponseSchema>;
export type RequestStatusTimelineEntry = z.infer<
  typeof requestStatusTimelineEntrySchema
>;
export type PublicRequestStatus = z.infer<typeof publicRequestStatusSchema>;
export type PublicRequestStatusPresentation = z.infer<
  typeof publicRequestStatusPresentationSchema
>;
export type RequestRecoveryState = z.infer<typeof requestRecoveryStateSchema>;
export type RequestRecoveryStateKind = z.infer<
  typeof requestRecoveryStateKindSchema
>;
export type RequestTrackingCredential = z.infer<
  typeof requestTrackingCredentialSchema
>;
export type CreateRequestRequest = z.infer<typeof createRequestRequestSchema>;
export type CreateRequestResponse = z.infer<typeof createRequestResponseSchema>;
export type RequestApiError = z.infer<typeof requestApiErrorSchema>;
export type RequestApiErrorResponse = z.infer<
  typeof requestApiErrorResponseSchema
>;
export type IssueType = z.infer<typeof issueTypeSchema>;
export type IssueTypeId = z.infer<typeof issueTypeIdSchema>;
export type IssueTypeList = z.infer<typeof issueTypeListSchema>;
export type IssueSelection = z.infer<typeof issueSelectionSchema>;
export type ClarifyingQuestionResponseType = z.infer<
  typeof clarifyingQuestionResponseTypeSchema
>;
export type ClarifyingQuestionOption = z.infer<typeof clarifyingQuestionOptionSchema>;
export type ClarifyingQuestion = z.infer<typeof clarifyingQuestionSchema>;
export type ClarifyingQuestionList = z.infer<typeof clarifyingQuestionListSchema>;
export type IntakeQuestionSet = z.infer<typeof intakeQuestionSetSchema>;
export type ClarifyingAnswer = z.infer<typeof clarifyingAnswerSchema>;
export type ClarifyingAnswerList = z.infer<typeof clarifyingAnswerListSchema>;
export type ServiceLocation = z.infer<typeof serviceLocationSchema>;
export type EvaluateIntakeRequest = z.infer<typeof evaluateIntakeRequestSchema>;
export type ServiceabilityStatus = z.infer<typeof serviceabilityStatusSchema>;
export type RecoveryCode = z.infer<typeof recoveryCodeSchema>;
export type IntakeNextStep = z.infer<typeof intakeNextStepSchema>;
export type IntakeClassification = z.infer<typeof intakeClassificationSchema>;
export type ContainmentGuidanceVariant = z.infer<
  typeof containmentGuidanceVariantSchema
>;
export type ContainmentGuidanceStep = z.infer<
  typeof containmentGuidanceStepSchema
>;
export type ContainmentGuidanceWarning = z.infer<
  typeof containmentGuidanceWarningSchema
>;
export type ContainmentGuidanceRequest = z.infer<
  typeof containmentGuidanceRequestSchema
>;
export type ContainmentGuidance = z.infer<typeof containmentGuidanceSchema>;
export type RequestReviewEditTarget = z.infer<
  typeof requestReviewEditTargetSchema
>;
export type RequestReviewSummaryItem = z.infer<
  typeof requestReviewSummaryItemSchema
>;
export type RequestReviewSection = z.infer<typeof requestReviewSectionSchema>;
export type RequestReviewExpectation = z.infer<
  typeof requestReviewExpectationSchema
>;
export type RequestReviewNextStep = z.infer<
  typeof requestReviewNextStepSchema
>;
export type RequestReviewRequest = z.infer<typeof requestReviewRequestSchema>;
export type RequestReviewSummary = z.infer<typeof requestReviewSummarySchema>;
