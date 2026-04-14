import { z } from 'zod';
import { issueTypeIdSchema } from './issue-types.schemas';

export const clarifyingQuestionResponseTypeSchema = z.enum(['boolean', 'singleSelect']);

export const clarifyingQuestionOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
});

export const clarifyingQuestionSchema = z.object({
  id: z.string().min(1),
  issueTypeId: issueTypeIdSchema,
  prompt: z.string().min(1),
  helperText: z.string().min(1).optional(),
  responseType: clarifyingQuestionResponseTypeSchema,
  required: z.literal(true),
  options: z.array(clarifyingQuestionOptionSchema).optional(),
});

export const clarifyingQuestionListSchema = z.array(clarifyingQuestionSchema);

export const intakeQuestionSetSchema = z.object({
  issueTypeId: issueTypeIdSchema,
  title: z.string().min(1),
  questions: clarifyingQuestionListSchema.min(1),
});

export const clarifyingAnswerValueSchema = z.union([z.boolean(), z.string().min(1)]);

export const clarifyingAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: clarifyingAnswerValueSchema,
});

export const clarifyingAnswerListSchema = z.array(clarifyingAnswerSchema);

export const serviceLocationSchema = z.object({
  addressLine1: z.string().trim().min(3),
  unitOrAccessNote: z.string().trim().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(2),
  postalCode: z.string().trim().regex(/^\d{5}$/),
  locationDetails: z.string().trim().max(200).optional().or(z.literal('')),
});

export const evaluateIntakeRequestSchema = z.object({
  issueTypeId: issueTypeIdSchema,
  answers: clarifyingAnswerListSchema,
  serviceLocation: serviceLocationSchema,
});

export const serviceabilityStatusSchema = z.enum([
  'serviceable',
  'outOfArea',
  'needsRecovery',
]);

export const recoveryCodeSchema = z.enum([
  'OUT_OF_SERVICE_AREA',
  'UNSUPPORTED_REQUEST_DETAILS',
]);

export const intakeNextStepSchema = z.enum([
  'continueToContainment',
  'showRecoveryPath',
]);

export const intakeClassificationSchema = z.object({
  issueTypeId: issueTypeIdSchema,
  serviceabilityStatus: serviceabilityStatusSchema,
  nextStep: intakeNextStepSchema,
  summaryHeadline: z.string().min(1),
  summaryDetail: z.string().min(1),
  recoveryCode: recoveryCodeSchema.optional(),
});

export const supportedServiceAreaPostalCodes = ['10001', '10011', '11201', '11215'] as const;

export const supportedServiceAreaPostalCodeSchema = z.enum(supportedServiceAreaPostalCodes);
