import { z } from 'zod';

export const submitFeedbackDtoSchema = z.object({
  satisfactionRating: z.number().int().min(1).max(5),
  reducedUncertainty: z.boolean().optional(),
  freeText: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) =>
      typeof value === 'string' && value.length === 0 ? undefined : value,
    ),
});

export type SubmitFeedbackDto = z.infer<typeof submitFeedbackDtoSchema>;

export const requestFeedbackSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1),
  satisfactionRating: z.number().int().min(1).max(5),
  reducedUncertainty: z.boolean().nullable().optional(),
  freeText: z.string().nullable().optional(),
  recordedAt: z.iso.datetime(),
});

export type RequestFeedback = z.infer<typeof requestFeedbackSchema>;

export const submitFeedbackResponseSchema = z.object({
  recordedAt: z.iso.datetime(),
  satisfactionRating: z.number().int().min(1).max(5),
  acknowledgement: z.string().min(1),
});

export type SubmitFeedbackResponse = z.infer<typeof submitFeedbackResponseSchema>;
