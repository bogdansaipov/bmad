import { z } from 'zod';

export const ServiceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const CategoryListResponseSchema = z.object({
  items: z.array(ServiceCategorySchema),
});

export const ImageUploadResponseSchema = z.object({
  imageId: z.string(),
});

export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;
export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>;
export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;
