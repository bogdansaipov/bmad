import { z } from 'zod';

export const publicRequestStatusSchema = z.enum([
  'received',
  'inReview',
  'dispatching',
  'delayed',
  'needsClarification',
  'completed',
  'unavailable',
]);

export const requestRecoveryStateKindSchema = z.enum([
  'clarification',
  'delay',
  'unavailable',
]);

export const requestTrackingCredentialSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.iso.datetime(),
});

export const publicRequestStatusPresentationSchema = z.object({
  publicStatus: publicRequestStatusSchema,
  publicStatusLabel: z.string().min(1),
  publicStatusDetail: z.string().min(1),
});

export const requestRecoveryStateSchema = z.object({
  kind: requestRecoveryStateKindSchema,
  title: z.string().min(1),
  detail: z.string().min(1),
  expectationUpdate: z.string().min(1),
  nextActionLabel: z.string().min(1),
  nextActionDetail: z.string().min(1),
  fallbackGuidance: z.string().min(1).optional(),
});

export const requestStatusTimelineEntrySchema = z
  .object({
    happenedAt: z.iso.datetime(),
    isCurrent: z.boolean(),
    changeSummary: z.string().min(1),
  })
  .extend(publicRequestStatusPresentationSchema.shape);

export const requestStatusLookupRequestSchema = z.object({
  publicId: z.string().trim().min(1),
  trackingToken: z.string().trim().min(1),
});

export const requestStatusResponseSchema = z
  .object({
    publicId: z.string().min(1),
    issueLabel: z.string().min(1),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    nextStepDetail: z.string().min(1),
    latestChangeSummary: z.string().min(1),
    recoveryState: requestRecoveryStateSchema.nullable().optional(),
    timeline: z.array(requestStatusTimelineEntrySchema).min(1),
  })
  .extend(publicRequestStatusPresentationSchema.shape);

export const requestStatusSchema = requestStatusResponseSchema;
