import { z } from 'zod';

export const SubmitRatingBodySchema = z.object({
  requestId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  shortFeedback: z.string().max(500).optional(),
});
export type SubmitRatingBody = z.infer<typeof SubmitRatingBodySchema>;

export const SubmitRatingResponseSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  stars: z.number(),
  shortFeedback: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type SubmitRatingResponse = z.infer<typeof SubmitRatingResponseSchema>;

export const RatingStatusResponseSchema = z.object({
  requestId: z.string(),
  hasRating: z.boolean(),
  stars: z.number().nullable(),
  shortFeedback: z.string().nullable(),
});
export type RatingStatusResponse = z.infer<typeof RatingStatusResponseSchema>;
