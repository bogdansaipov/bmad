import { z } from 'zod';

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
