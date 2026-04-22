import { z } from 'zod';

export const requestLifecycleStates = [
  'awaiting_confirmation',
  'intake_in_review',
  'dispatch_in_progress',
  'dispatch_delayed',
  'clarification_needed',
  'completed',
  'unfulfilled',
] as const;

export const requestLifecycleStateSchema = z.enum(requestLifecycleStates);

export type RequestLifecycleState = z.infer<typeof requestLifecycleStateSchema>;
