import { z } from 'zod';
import { opsAssignmentStateSchema } from './ops-assignment.schemas';
import {
  opsInterventionHistorySchema,
  opsInterventionSummarySchema,
} from './ops-intervention.schemas';
import { opsLifecycleTransitionOptionSchema } from './ops-status-update.schemas';
import { containmentGuidanceSchema } from '../requests/containment-guidance.schemas';
import { requestReviewSummarySchema } from '../requests/request-review.schemas';
import {
  clarifyingAnswerValueSchema,
  intakeClassificationSchema,
  serviceLocationSchema,
  serviceabilityStatusSchema,
} from '../requests/intake.schemas';
import { requestLifecycleStateSchema } from '../requests/request-lifecycle.schemas';
import {
  publicRequestStatusPresentationSchema,
  publicRequestStatusSchema,
  requestRecoveryStateSchema,
} from '../requests/request-status.schemas';

export const opsRequestDetailAnswerSchema = z.object({
  questionId: z.string().min(1),
  questionLabel: z.string().min(1),
  answerValue: clarifyingAnswerValueSchema,
  answerLabel: z.string().min(1),
});

export const opsRequestDetailCurrentStateSchema = z
  .object({
    lifecycleState: requestLifecycleStateSchema,
    lifecycleStateLabel: z.string().min(1),
    lifecycleStateDetail: z.string().min(1),
  })
  .extend(publicRequestStatusPresentationSchema.shape);

export const opsDispatchReadinessSchema = z.enum([
  'readyForReview',
  'readyForAssignment',
  'needsClarification',
  'blocked',
  'dispatchInProgress',
  'unavailable',
  'completed',
]);

export const opsRequestServiceabilitySummarySchema = z.object({
  serviceabilityStatus: serviceabilityStatusSchema,
  serviceabilityLabel: z.string().min(1),
  classificationHeadline: z.string().min(1),
  classificationDetail: z.string().min(1),
  scopeDecisionLabel: z.string().min(1),
  scopeDecisionDetail: z.string().min(1),
  coverageDecisionLabel: z.string().min(1),
  coverageDecisionDetail: z.string().min(1),
  dispatchReadiness: opsDispatchReadinessSchema,
  dispatchReadinessLabel: z.string().min(1),
  dispatchReadinessDetail: z.string().min(1),
});

export const opsCustomerSnapshotSchema = z
  .object({
    nextStepDetail: z.string().min(1),
    recoveryState: requestRecoveryStateSchema.nullable(),
  })
  .extend(publicRequestStatusPresentationSchema.shape);

export const opsRequestDetailHistoryEntrySchema = z.object({
  previousLifecycleState: requestLifecycleStateSchema.nullable(),
  nextLifecycleState: requestLifecycleStateSchema,
  previousPublicStatus: publicRequestStatusSchema.nullable(),
  nextPublicStatus: publicRequestStatusSchema,
  occurredAt: z.iso.datetime(),
  actorType: z.enum(['system', 'customer', 'ops', 'support']),
  actorId: z.string().min(1).optional(),
  changeSummary: z.string().min(1),
  intervention: opsInterventionHistorySchema.nullable().optional(),
  customerSnapshot: opsCustomerSnapshotSchema,
});

export const opsCustomerContextSchema = z.object({
  containmentGuidance: containmentGuidanceSchema.nullable(),
  requestReviewSummary: requestReviewSummarySchema.nullable(),
});

export const opsRequestDetailResponseSchema = z.object({
  publicId: z.string().min(1),
  issueTypeId: z.string().min(1),
  issueLabel: z.string().min(1),
  createdAt: z.iso.datetime(),
  serviceLocation: serviceLocationSchema,
  classification: intakeClassificationSchema,
  currentState: opsRequestDetailCurrentStateSchema,
  serviceability: opsRequestServiceabilitySummarySchema,
  intakeAnswers: z.array(opsRequestDetailAnswerSchema),
  customerContext: opsCustomerContextSchema,
  assignment: opsAssignmentStateSchema,
  intervention: opsInterventionSummarySchema.nullable(),
  availableTransitions: z.array(opsLifecycleTransitionOptionSchema),
  history: z.array(opsRequestDetailHistoryEntrySchema).min(1),
});

export type OpsRequestDetailAnswer = z.infer<
  typeof opsRequestDetailAnswerSchema
>;
export type OpsDispatchReadiness = z.infer<typeof opsDispatchReadinessSchema>;
export type OpsRequestDetailCurrentState = z.infer<
  typeof opsRequestDetailCurrentStateSchema
>;
export type OpsRequestServiceabilitySummary = z.infer<
  typeof opsRequestServiceabilitySummarySchema
>;
export type OpsCustomerSnapshot = z.infer<typeof opsCustomerSnapshotSchema>;
export type OpsRequestDetailHistoryEntry = z.infer<
  typeof opsRequestDetailHistoryEntrySchema
>;
export type OpsCustomerContext = z.infer<typeof opsCustomerContextSchema>;
export type OpsRequestDetailResponse = z.infer<
  typeof opsRequestDetailResponseSchema
>;
