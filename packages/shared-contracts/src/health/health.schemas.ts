import { z } from 'zod';

export const requestLifecycleStates = [
  'awaiting_confirmation',
  'intake_in_review',
  'dispatch_in_progress',
  'clarification_needed',
  'completed',
  'unfulfilled',
] as const;

export const requestLifecycleStateSchema = z.enum(requestLifecycleStates);

export const healthPayloadSchema = z.object({
  service: z.literal('handrix-api'),
  status: z.literal('ok'),
  supportedLifecycleStates: z.array(requestLifecycleStateSchema),
});

export type HealthPayload = z.infer<typeof healthPayloadSchema>;
