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

export const RequestTrackingResponseSchema = z.object({
  requestId: z.string(),
  title: z.string(),
  status: RequestStatusEnum,
  categoryName: z.string(),
  estimatedTotal: z.number().nullable(),
  description: z.string().nullable(),
  locationLat: z.number().nullable(),
  locationLng: z.number().nullable(),
  assignedHandymanDisplayName: z.string().nullable(),
  handymanLat: z.number().nullable(),
  handymanLng: z.number().nullable(),
  handymanLocationAt: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type RequestTrackingResponse = z.infer<typeof RequestTrackingResponseSchema>;

export const ActiveJobResponseSchema = z.object({
  requestId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: RequestStatusEnum,
  categoryName: z.string(),
  estimatedTotal: z.number().nullable(),
  locationLat: z.number().nullable(),
  locationLng: z.number().nullable(),
  createdAt: z.string().datetime(),
});
export type ActiveJobResponse = z.infer<typeof ActiveJobResponseSchema>;

export const UpdateJobStatusBodySchema = z.object({
  status: z.enum(['ON_THE_WAY', 'ARRIVED', 'WORKING', 'COMPLETE']),
});
export type UpdateJobStatusBody = z.infer<typeof UpdateJobStatusBodySchema>;

export const UpdateJobStatusResponseSchema = z.object({
  requestId: z.string(),
  status: RequestStatusEnum,
});
export type UpdateJobStatusResponse = z.infer<typeof UpdateJobStatusResponseSchema>;

export const PostLocationBodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type PostLocationBody = z.infer<typeof PostLocationBodySchema>;

export const PostLocationResponseSchema = z.object({
  id: z.string(),
  recordedAt: z.string().datetime(),
});
export type PostLocationResponse = z.infer<typeof PostLocationResponseSchema>;
