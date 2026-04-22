import { z } from 'zod';
import { supportRequestDetailResponseSchema } from './support-request-detail.schemas';

export const supportInterventionKindSchema = z.enum([
  'clarification',
  'blocker',
  'unavailable',
]);

export const supportInterventionNoteSchema = z.string().trim().min(1).max(280);

export const supportInterventionRequestSchema = z.object({
  kind: supportInterventionKindSchema,
  note: supportInterventionNoteSchema,
  updateLifecycle: z.boolean().optional(),
});

export const supportInterventionResponseSchema =
  supportRequestDetailResponseSchema;

export type SupportInterventionKind = z.infer<
  typeof supportInterventionKindSchema
>;
export type SupportInterventionNote = z.infer<
  typeof supportInterventionNoteSchema
>;
export type SupportInterventionRequest = z.infer<
  typeof supportInterventionRequestSchema
>;
export type SupportInterventionResponse = z.infer<
  typeof supportInterventionResponseSchema
>;
