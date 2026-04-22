import { z } from 'zod';
import { requestLifecycleStateSchema } from '../requests/request-lifecycle.schemas';

export const healthCheckStatusSchema = z.enum(['ok', 'error']);
export type HealthCheckStatus = z.infer<typeof healthCheckStatusSchema>;

export const healthCheckSchema = z.object({
  status: healthCheckStatusSchema,
  detail: z.string().min(1),
});

export const healthPayloadSchema = z.object({
  service: z.literal('handrix-api'),
  status: z.enum(['ok', 'degraded']),
  supportedLifecycleStates: z.array(requestLifecycleStateSchema),
  checks: z.object({
    liveness: healthCheckSchema,
    readiness: healthCheckSchema,
    database: healthCheckSchema,
  }),
});

export type HealthPayload = z.infer<typeof healthPayloadSchema>;
