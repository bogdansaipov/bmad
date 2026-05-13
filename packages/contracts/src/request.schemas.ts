import { z } from 'zod';

export const RequestStatusEnum = z.enum([
  'PENDING',
  'ASSIGNED',
  'ON_THE_WAY',
  'ARRIVED',
  'WORKING',
  'COMPLETE',
  'REJECTED',
]);

export type RequestStatus = z.infer<typeof RequestStatusEnum>;

export const ServiceRequestListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: RequestStatusEnum,
  estimatedTotal: z.number().nullable(),
  categoryName: z.string(),
  assignedHandymanDisplayName: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type ServiceRequestListItem = z.infer<typeof ServiceRequestListItemSchema>;

export const CustomerRequestListResponseSchema = z.object({
  items: z.array(ServiceRequestListItemSchema),
});

export type CustomerRequestListResponse = z.infer<typeof CustomerRequestListResponseSchema>;
