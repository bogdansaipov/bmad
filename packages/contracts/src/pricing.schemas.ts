import { z } from 'zod';

export const PricingEstimateSchema = z.object({
  categoryId: z.string().uuid(),
  baseFee: z.number(),
  categoryFee: z.number(),
  partsAllowance: z.number(),
  estimatedTotal: z.number(),
  disclaimer: z.string(),
});

export type PricingEstimate = z.infer<typeof PricingEstimateSchema>;
