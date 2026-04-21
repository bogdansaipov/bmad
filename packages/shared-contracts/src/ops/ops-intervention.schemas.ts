import { z } from 'zod';

export const opsInterventionKindSchema = z.enum([
  'clarification',
  'blocker',
  'unavailable',
]);

export const opsInterventionHistoryEventSchema = z.object({
  occurredAt: z.iso.datetime(),
  actorType: z.enum(['system', 'customer', 'ops', 'support']),
  changeSummary: z.string().min(1),
});

export const opsInterventionHistorySchema = z.object({
  kind: opsInterventionKindSchema,
  label: z.string().min(1),
  detail: z.string().min(1),
});

export const opsInterventionSummarySchema = z.object({
  kind: opsInterventionKindSchema,
  label: z.string().min(1),
  detail: z.string().min(1),
  recommendedAction: z.string().min(1),
  customerImpact: z.string().min(1),
  latestRelevantChange: opsInterventionHistoryEventSchema.nullable(),
});

export type OpsInterventionKind = z.infer<typeof opsInterventionKindSchema>;
export type OpsInterventionHistoryEvent = z.infer<
  typeof opsInterventionHistoryEventSchema
>;
export type OpsInterventionHistory = z.infer<
  typeof opsInterventionHistorySchema
>;
export type OpsInterventionSummary = z.infer<
  typeof opsInterventionSummarySchema
>;
