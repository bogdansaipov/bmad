import { z } from 'zod';

export const measurementSummarySchema = z.object({
  since: z.iso.datetime(),
  generatedAt: z.iso.datetime(),
  conversionRate: z.object({
    flowStartedCount: z.number().int().nonnegative(),
    confirmedCount: z.number().int().nonnegative(),
    rate: z.number().min(0).max(1).nullable(),
  }),
  fulfillmentWindow: z.object({
    sampleSize: z.number().int().nonnegative(),
    withinWindowCount: z.number().int().nonnegative(),
    compliance: z.number().min(0).max(1).nullable(),
    promisedResponseMinutes: z.number().int().positive(),
  }),
  supportEngagementRate: z.object({
    confirmedCount: z.number().int().nonnegative(),
    supportEngagedCount: z.number().int().nonnegative(),
    rate: z.number().min(0).max(1).nullable(),
  }),
  cancellationRate: z.object({
    confirmedCount: z.number().int().nonnegative(),
    cancelledCount: z.number().int().nonnegative(),
    rate: z.number().min(0).max(1).nullable(),
  }),
  feedbackSummary: z.object({
    sampleSize: z.number().int().nonnegative(),
    averageSatisfaction: z.number().min(0).max(5).nullable(),
    reducedUncertaintyRate: z.number().min(0).max(1).nullable(),
  }),
});

export type MeasurementSummary = z.infer<typeof measurementSummarySchema>;
