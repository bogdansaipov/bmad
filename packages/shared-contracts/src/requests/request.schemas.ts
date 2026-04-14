import { z } from 'zod';
import { requestLifecycleStateSchema } from '../health/health.schemas';
import { requestReviewRequestSchema } from './request-review.schemas';

export const publicRequestStatusSchema = z.enum([
  'received',
  'inReview',
  'dispatching',
  'needsClarification',
  'completed',
  'unavailable',
]);

export const requestTrackingCredentialSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.iso.datetime(),
});

export const requestStatusSchema = z.object({
  publicId: z.string().min(1),
  lifecycleState: requestLifecycleStateSchema,
  publicStatus: publicRequestStatusSchema,
  updatedAt: z.iso.datetime(),
});

export const createRequestRequestSchema = requestReviewRequestSchema.extend({
  idempotencyKey: z.string().trim().min(8).max(120),
});

export const createRequestResponseSchema = z.object({
  publicId: z.string().min(1),
  issueTypeId: z.string().min(1),
  issueLabel: z.string().min(1),
  lifecycleState: requestLifecycleStateSchema,
  publicStatus: publicRequestStatusSchema,
  createdAt: z.iso.datetime(),
  confirmationHeadline: z.string().min(1),
  confirmationDetail: z.string().min(1),
  nextStepDetail: z.string().min(1),
  trackingCredential: requestTrackingCredentialSchema,
});

export const requestApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  recoveryHint: z.string().min(1).optional(),
});

export const requestApiErrorResponseSchema = z.object({
  error: requestApiErrorSchema,
});
