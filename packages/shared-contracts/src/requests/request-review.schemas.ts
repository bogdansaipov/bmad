import { z } from 'zod'
import {
  clarifyingAnswerListSchema,
  intakeClassificationSchema,
  serviceLocationSchema,
} from './intake.schemas'
import { issueTypeIdSchema } from './issue-types.schemas'

export const requestReviewEditTargetSchema = z.enum([
  'issueDetails',
  'serviceLocation',
])

export const requestReviewSummaryItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
})

export const requestReviewSectionSchema = z.object({
  title: z.string().min(1),
  editTarget: requestReviewEditTargetSchema,
  editLabel: z.string().min(1),
  items: z.array(requestReviewSummaryItemSchema).min(1),
})

export const requestReviewExpectationSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().min(1),
})

export const requestReviewNextStepSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
})

export const requestReviewRequestSchema = z.object({
  issueTypeId: issueTypeIdSchema,
  answers: clarifyingAnswerListSchema,
  serviceLocation: serviceLocationSchema,
  classification: intakeClassificationSchema,
})

export const requestReviewSummarySchema = z.object({
  issueTypeId: issueTypeIdSchema,
  issueLabel: z.string().min(1),
  headline: z.string().min(1),
  intro: z.string().min(1),
  sections: z.array(requestReviewSectionSchema).min(2),
  eta: requestReviewExpectationSchema,
  pricing: requestReviewExpectationSchema,
  nextSteps: requestReviewNextStepSchema,
  confirmationLabel: z.string().min(1),
  confirmationHint: z.string().min(1),
})
