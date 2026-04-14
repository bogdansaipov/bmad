import { z } from 'zod';
import {
  intakeNextStepSchema,
  recoveryCodeSchema,
  serviceabilityStatusSchema,
} from './intake.schemas';
import { issueTypeIdSchema } from './issue-types.schemas';

export const containmentGuidanceVariantSchema = z.enum([
  'informational',
  'warning',
  'recovery',
]);

export const containmentGuidanceStepSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
});

export const containmentGuidanceWarningSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
});

export const containmentGuidanceRequestSchema = z.object({
  serviceabilityStatus: serviceabilityStatusSchema,
  nextStep: intakeNextStepSchema,
  recoveryCode: recoveryCodeSchema.optional(),
});

export const containmentGuidanceSchema = z.object({
  issueTypeId: issueTypeIdSchema,
  serviceabilityStatus: serviceabilityStatusSchema,
  nextStep: intakeNextStepSchema,
  recoveryCode: recoveryCodeSchema.optional(),
  variant: containmentGuidanceVariantSchema,
  headline: z.string().min(1),
  intro: z.string().min(1),
  steps: z.array(containmentGuidanceStepSchema).min(1),
  warnings: z.array(containmentGuidanceWarningSchema),
  reassurance: z.string().min(1),
  nextActionLabel: z.string().min(1),
  nextActionHint: z.string().min(1),
});
