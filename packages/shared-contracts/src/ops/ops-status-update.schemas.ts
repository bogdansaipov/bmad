import { z } from 'zod';
import { requestLifecycleStateSchema } from '../health/health.schemas';
import { publicRequestStatusPresentationSchema } from '../requests/request-status.schemas';

export const opsStatusUpdateNoteSchema = z.string().trim().max(280);

export const opsUpdateRequestStatusSchema = z.object({
  nextLifecycleState: requestLifecycleStateSchema,
  note: opsStatusUpdateNoteSchema.optional(),
});

export const opsLifecycleTransitionOptionSchema = z
  .object({
    nextLifecycleState: requestLifecycleStateSchema,
    actionLabel: z.string().min(1),
    actionDetail: z.string().min(1),
    nextLifecycleStateLabel: z.string().min(1),
    nextLifecycleStateDetail: z.string().min(1),
  })
  .extend(publicRequestStatusPresentationSchema.shape);

export type OpsStatusUpdateNote = z.infer<typeof opsStatusUpdateNoteSchema>;
export type OpsUpdateRequestStatus = z.infer<
  typeof opsUpdateRequestStatusSchema
>;
export type OpsLifecycleTransitionOption = z.infer<
  typeof opsLifecycleTransitionOptionSchema
>;
