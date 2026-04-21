import { z } from 'zod';

export const supportSearchRequestQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const supportRequestSearchResultSchema = z.object({
  publicId: z.string().min(1),
  issueLabel: z.string().min(1),
  addressSummary: z.string().min(1),
  currentPublicStatusLabel: z.string().min(1),
  currentPublicStatusDetail: z.string().min(1),
  currentInternalLifecycleLabel: z.string().min(1),
  currentInternalLifecycleDetail: z.string().min(1),
  receivedAt: z.iso.datetime(),
  lastUpdatedAt: z.iso.datetime(),
  latestChangeSummary: z.string().min(1),
  currentAssignmentOwnerLabel: z.string().min(1).nullable(),
  interventionLabel: z.string().min(1).nullable(),
});

export const supportRequestSearchSummarySchema = z.object({
  totalMatched: z.number().int().nonnegative(),
  limitReached: z.boolean(),
});

export const supportRequestSearchResponseSchema = z.object({
  items: z.array(supportRequestSearchResultSchema),
  summary: supportRequestSearchSummarySchema,
  refreshedAt: z.iso.datetime(),
  query: z.object({
    q: z.string().nullable(),
    normalizedQ: z.string(),
    limit: z.number().int().positive(),
  }),
});

export type SupportSearchRequestQuery = z.infer<
  typeof supportSearchRequestQuerySchema
>;
export type SupportRequestSearchResult = z.infer<
  typeof supportRequestSearchResultSchema
>;
export type SupportRequestSearchSummary = z.infer<
  typeof supportRequestSearchSummarySchema
>;
export type SupportRequestSearchResponse = z.infer<
  typeof supportRequestSearchResponseSchema
>;
