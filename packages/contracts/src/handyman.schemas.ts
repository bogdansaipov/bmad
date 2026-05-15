import { z } from 'zod';

export const JOB_OFFER_STATUS = {
  PENDING: 'pending',
  DECLINED: 'declined',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  HIDDEN: 'hidden',
} as const;

export const HANDYMAN_AVAILABILITY_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
} as const;

export const HandymanJobFeedItemSchema = z.object({
  offerId: z.string(),
  requestId: z.string(),
  categoryName: z.string(),
  distanceKm: z.number().nullable(),
  roughArea: z.string().nullable(),
  estimatedTotal: z.number(),
  shortDescription: z.string(),
  offeredAt: z.string(),
});

export const HandymanJobFeedResponseSchema = z.array(HandymanJobFeedItemSchema);

export const UpdateHandymanAvailabilityRequestSchema = z.object({
  availabilityStatus: z.enum(['online', 'offline']),
});

export const UpdateHandymanBaseLocationRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type HandymanJobFeedItem = z.infer<typeof HandymanJobFeedItemSchema>;
export type HandymanJobFeedResponse = z.infer<typeof HandymanJobFeedResponseSchema>;
export type UpdateHandymanAvailabilityRequest = z.infer<typeof UpdateHandymanAvailabilityRequestSchema>;
export type UpdateHandymanBaseLocationRequest = z.infer<typeof UpdateHandymanBaseLocationRequestSchema>;

export const HandymanCategoryPreferenceSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
});

const MIN_SERVICE_RADIUS_KM = 0.5;
const MAX_SERVICE_RADIUS_KM = 200;

export const HandymanProfileSetupResponseSchema = z.object({
  displayName: z.string(),
  availabilityStatus: z.string(),
  serviceRadiusKm: z
    .number()
    .min(MIN_SERVICE_RADIUS_KM)
    .max(MAX_SERVICE_RADIUS_KM)
    .nullable(),
  categories: z.array(HandymanCategoryPreferenceSchema),
  isProfileComplete: z.boolean(),
});

export const UpdateHandymanProfileRequestSchema = z.object({
  serviceRadiusKm: z
    .number()
    .positive()
    .min(MIN_SERVICE_RADIUS_KM)
    .max(MAX_SERVICE_RADIUS_KM),
  categoryIds: z.array(z.string().uuid()).min(1).max(50),
});

export const HANDYMAN_SERVICE_RADIUS_BOUNDS = {
  min: MIN_SERVICE_RADIUS_KM,
  max: MAX_SERVICE_RADIUS_KM,
} as const;

export const HANDYMAN_MAX_CATEGORIES = 50;

export type HandymanCategoryPreference = z.infer<typeof HandymanCategoryPreferenceSchema>;
export type HandymanProfileSetupResponse = z.infer<typeof HandymanProfileSetupResponseSchema>;
export type UpdateHandymanProfileRequest = z.infer<typeof UpdateHandymanProfileRequestSchema>;

export const HandymanJobHistoryItemSchema = z.object({
  offerId: z.string(),
  requestId: z.string(),
  offerStatus: z.string(),
  requestTitle: z.string(),
  requestDescription: z.string(),
  categoryName: z.string(),
  estimatedTotal: z.number(),
  requestStatus: z.string(),
  offeredAt: z.string(),
  respondedAt: z.string().nullable(),
});

export const HandymanJobHistoryResponseSchema = z.array(HandymanJobHistoryItemSchema);

export type HandymanJobHistoryItem = z.infer<typeof HandymanJobHistoryItemSchema>;
export type HandymanJobHistoryResponse = z.infer<typeof HandymanJobHistoryResponseSchema>;

export const AcceptJobResponseSchema = z.object({
  requestId: z.string(),
  status: z.literal('ASSIGNED'),
});

export const DeclineJobResponseSchema = z.object({
  offerId: z.string(),
  offerStatus: z.literal('declined'),
});

export type AcceptJobResponse = z.infer<typeof AcceptJobResponseSchema>;
export type DeclineJobResponse = z.infer<typeof DeclineJobResponseSchema>;
