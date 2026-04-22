import { z } from 'zod';
import { containmentGuidanceSchema } from '../requests/containment-guidance.schemas';
import {
  intakeClassificationSchema,
  serviceLocationSchema,
} from '../requests/intake.schemas';
import { requestLifecycleStateSchema } from '../requests/request-lifecycle.schemas';
import { requestReviewSummarySchema } from '../requests/request-review.schemas';
import {
  publicRequestStatusSchema,
  requestRecoveryStateSchema,
} from '../requests/request-status.schemas';

export const supportRequestDetailCurrentStateSchema = z.object({
  lifecycleState: requestLifecycleStateSchema,
  lifecycleStateLabel: z.string().min(1),
  lifecycleStateDetail: z.string().min(1),
  publicStatus: publicRequestStatusSchema,
  publicStatusLabel: z.string().min(1),
  publicStatusDetail: z.string().min(1),
});

export const supportRequestDetailAnswerSchema = z.object({
  questionLabel: z.string().min(1),
  answerLabel: z.string().min(1),
});

export const supportRequestDetailCustomerContextSchema = z.object({
  containmentGuidance: containmentGuidanceSchema.nullable(),
  requestReviewSummary: requestReviewSummarySchema.nullable(),
});

export const supportRequestDetailAssignmentSchema = z.object({
  ownerType: z.enum(['provider', 'internalOwner']),
  ownerTypeLabel: z.string().min(1),
  ownerLabel: z.string().min(1),
  assignedAt: z.iso.datetime(),
  note: z.string().min(1).optional(),
});

export const supportRequestDetailInterventionEventSchema = z.object({
  occurredAt: z.iso.datetime(),
  actorType: z.enum(['system', 'customer', 'ops', 'support']),
  changeSummary: z.string().min(1),
});

export const supportRequestVisibilitySchema = z.enum(['customer', 'internal']);

export const supportRequestDetailInterventionSchema = z.object({
  kind: z.enum(['clarification', 'blocker', 'unavailable']),
  label: z.string().min(1),
  detail: z.string().min(1),
  customerImpact: z.string().min(1),
  latestRelevantChange: supportRequestDetailInterventionEventSchema.nullable(),
});

export const supportRequestDetailExplanationSchema = z.object({
  kind: z.enum(['clarification', 'delay', 'blocker', 'unavailable']),
  label: z.string().min(1),
  detail: z.string().min(1),
  reasonDetail: z.string().min(1),
  expectationUpdate: z.string().min(1),
  nextActionLabel: z.string().min(1),
  nextActionDetail: z.string().min(1),
  fallbackGuidance: z.string().min(1).optional(),
  customerVisibleRecovery: requestRecoveryStateSchema.nullable(),
  latestRelevantChange: supportRequestDetailInterventionEventSchema.nullable(),
});

export const supportRequestDetailHistoryInterventionSchema = z.object({
  kind: z.enum(['clarification', 'blocker', 'unavailable']),
  label: z.string().min(1),
  detail: z.string().min(1),
});

export const supportRequestDetailFollowUpSchema = z.object({
  kind: z.enum(['clarification', 'blocker', 'unavailable']),
  label: z.string().min(1),
  detail: z.string().min(1),
  recordedAt: z.iso.datetime(),
  actorType: z.literal('support'),
  visibility: supportRequestVisibilitySchema,
  visibilityLabel: z.string().min(1),
  affectsLifecycle: z.boolean(),
});

export const supportRequestDetailCustomerSnapshotSchema = z.object({
  publicStatus: publicRequestStatusSchema,
  publicStatusLabel: z.string().min(1),
  publicStatusDetail: z.string().min(1),
  nextStepDetail: z.string().min(1),
  recoveryState: requestRecoveryStateSchema.nullable(),
});

export const supportRequestDetailHistoryEntrySchema = z.object({
  previousLifecycleState: requestLifecycleStateSchema.nullable(),
  nextLifecycleState: requestLifecycleStateSchema,
  previousLifecycleStateLabel: z.string().min(1).nullable(),
  nextLifecycleStateLabel: z.string().min(1),
  previousPublicStatus: publicRequestStatusSchema.nullable(),
  nextPublicStatus: publicRequestStatusSchema,
  previousPublicStatusLabel: z.string().min(1).nullable(),
  nextPublicStatusLabel: z.string().min(1),
  occurredAt: z.iso.datetime(),
  actorType: z.enum(['system', 'customer', 'ops', 'support']),
  changeSummary: z.string().min(1),
  visibility: supportRequestVisibilitySchema,
  visibilityLabel: z.string().min(1),
  intervention: supportRequestDetailHistoryInterventionSchema.nullable(),
  customerSnapshot: supportRequestDetailCustomerSnapshotSchema,
});

export const supportRequestDetailResponseSchema = z.object({
  publicId: z.string().min(1),
  issueTypeId: z.string().min(1),
  issueLabel: z.string().min(1),
  createdAt: z.iso.datetime(),
  serviceLocation: serviceLocationSchema,
  classification: intakeClassificationSchema,
  currentState: supportRequestDetailCurrentStateSchema,
  intakeAnswers: z.array(supportRequestDetailAnswerSchema),
  customerContext: supportRequestDetailCustomerContextSchema,
  assignment: supportRequestDetailAssignmentSchema.nullable(),
  intervention: supportRequestDetailInterventionSchema.nullable(),
  explanation: supportRequestDetailExplanationSchema.nullable(),
  latestSupportFollowUp: supportRequestDetailFollowUpSchema.nullable(),
  history: z.array(supportRequestDetailHistoryEntrySchema).min(1),
  latestChangeSummary: z.string().min(1),
  lastUpdatedAt: z.iso.datetime(),
});

export type SupportRequestDetailAnswer = z.infer<
  typeof supportRequestDetailAnswerSchema
>;
export type SupportRequestDetailCustomerContext = z.infer<
  typeof supportRequestDetailCustomerContextSchema
>;
export type SupportRequestDetailAssignment = z.infer<
  typeof supportRequestDetailAssignmentSchema
>;
export type SupportRequestDetailIntervention = z.infer<
  typeof supportRequestDetailInterventionSchema
>;
export type SupportRequestDetailExplanation = z.infer<
  typeof supportRequestDetailExplanationSchema
>;
export type SupportRequestDetailHistoryIntervention = z.infer<
  typeof supportRequestDetailHistoryInterventionSchema
>;
export type SupportRequestDetailFollowUp = z.infer<
  typeof supportRequestDetailFollowUpSchema
>;
export type SupportRequestDetailCustomerSnapshot = z.infer<
  typeof supportRequestDetailCustomerSnapshotSchema
>;
export type SupportRequestDetailHistoryEntry = z.infer<
  typeof supportRequestDetailHistoryEntrySchema
>;
export type SupportRequestVisibility = z.infer<
  typeof supportRequestVisibilitySchema
>;
export type SupportRequestDetailCurrentState = z.infer<
  typeof supportRequestDetailCurrentStateSchema
>;
export type SupportRequestDetailResponse = z.infer<
  typeof supportRequestDetailResponseSchema
>;
