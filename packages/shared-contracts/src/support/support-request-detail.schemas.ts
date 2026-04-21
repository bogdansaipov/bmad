import { z } from 'zod';
import { requestLifecycleStateSchema } from '../health/health.schemas';
import { serviceLocationSchema } from '../requests/intake.schemas';
import { publicRequestStatusSchema } from '../requests/request-status.schemas';

export const supportRequestDetailCurrentStateSchema = z.object({
  lifecycleState: requestLifecycleStateSchema,
  lifecycleStateLabel: z.string().min(1),
  lifecycleStateDetail: z.string().min(1),
  publicStatus: publicRequestStatusSchema,
  publicStatusLabel: z.string().min(1),
  publicStatusDetail: z.string().min(1),
});

export const supportRequestDetailResponseSchema = z.object({
  publicId: z.string().min(1),
  issueTypeId: z.string().min(1),
  issueLabel: z.string().min(1),
  createdAt: z.iso.datetime(),
  serviceLocation: serviceLocationSchema,
  currentState: supportRequestDetailCurrentStateSchema,
  latestChangeSummary: z.string().min(1),
  currentAssignmentOwnerLabel: z.string().min(1).nullable(),
  interventionLabel: z.string().min(1).nullable(),
  lastUpdatedAt: z.iso.datetime(),
});

export type SupportRequestDetailCurrentState = z.infer<
  typeof supportRequestDetailCurrentStateSchema
>;
export type SupportRequestDetailResponse = z.infer<
  typeof supportRequestDetailResponseSchema
>;
