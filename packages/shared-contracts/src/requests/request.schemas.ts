import { z } from 'zod';
import { requestReviewRequestSchema } from './request-review.schemas';
import {
  publicRequestStatusPresentationSchema,
  requestTrackingCredentialSchema,
} from './request-status.schemas';

export const createRequestRequestSchema = requestReviewRequestSchema.extend({
  idempotencyKey: z.string().trim().min(8).max(120),
});

export const createRequestResponseSchema = z
  .object({
    publicId: z.string().min(1),
    issueTypeId: z.string().min(1),
    issueLabel: z.string().min(1),
    createdAt: z.iso.datetime(),
    confirmationHeadline: z.string().min(1),
    confirmationDetail: z.string().min(1),
    nextStepDetail: z.string().min(1),
    trackingCredential: requestTrackingCredentialSchema,
  })
  .extend(publicRequestStatusPresentationSchema.shape);

export const requestApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  recoveryHint: z.string().min(1).optional(),
});

export const requestApiErrorResponseSchema = z.object({
  error: requestApiErrorSchema,
});
