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

export const CreateRequestBodySchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  imageId: z.string().uuid().optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
});

export const CreateRequestResponseSchema = z.object({
  id: z.string().uuid(),
  status: RequestStatusEnum,
  estimatedTotal: z.number().nullable(),
  categoryName: z.string(),
  createdAt: z.string().datetime(),
});

export type CustomerRequestListResponse = z.infer<typeof CustomerRequestListResponseSchema>;
export type CreateRequestBody = z.infer<typeof CreateRequestBodySchema>;
export type CreateRequestResponse = z.infer<typeof CreateRequestResponseSchema>;
