import {
  OBSERVABILITY_EVENT_NAMES,
  type MeasurementSummary,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const DEFAULT_PROMISED_RESPONSE_MINUTES = 60;

function clampRate(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value > 1 ? 1 : value;
}

@Injectable()
export class MeasurementService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversionRate(since: Date) {
    const [flowStartedCount, confirmedCount] = await Promise.all([
      this.prisma.observabilityEvent.count({
        where: {
          eventName: OBSERVABILITY_EVENT_NAMES.flowStarted,
          occurredAt: { gte: since },
        },
      }),
      this.prisma.serviceRequest.count({
        where: {
          confirmedAt: { gte: since, not: null },
        },
      }),
    ]);

    const rate =
      flowStartedCount === 0
        ? null
        : clampRate(confirmedCount / flowStartedCount);

    return { flowStartedCount, confirmedCount, rate };
  }

  async getFulfillmentWindowCompliance(
    since: Date,
    promisedResponseMinutes: number = DEFAULT_PROMISED_RESPONSE_MINUTES,
  ) {
    const fulfilledRequests = await this.prisma.serviceRequest.findMany({
      where: {
        fulfilledAt: { gte: since, not: null },
        confirmedAt: { not: null },
      },
      select: {
        confirmedAt: true,
        fulfilledAt: true,
      },
    });

    const promisedMs = promisedResponseMinutes * 60 * 1000;
    const sampleSize = fulfilledRequests.length;
    const withinWindowCount = fulfilledRequests.reduce((count, entry) => {
      if (!entry.confirmedAt || !entry.fulfilledAt) {
        return count;
      }

      const durationMs =
        entry.fulfilledAt.getTime() - entry.confirmedAt.getTime();

      if (durationMs < 0) {
        return count;
      }

      return durationMs <= promisedMs ? count + 1 : count;
    }, 0);

    const compliance =
      sampleSize === 0 ? null : clampRate(withinWindowCount / sampleSize);

    return {
      sampleSize,
      withinWindowCount,
      compliance,
      promisedResponseMinutes,
    };
  }

  async getSupportEngagementRate(since: Date) {
    const [confirmedCount, supportEngagedIds] = await Promise.all([
      this.prisma.serviceRequest.count({
        where: {
          confirmedAt: { gte: since, not: null },
        },
      }),
      this.prisma.observabilityEvent.findMany({
        where: {
          eventName: OBSERVABILITY_EVENT_NAMES.supportContactInitiated,
          occurredAt: { gte: since },
          publicId: { not: null },
        },
        select: {
          publicId: true,
        },
        distinct: ['publicId'],
      }),
    ]);

    const supportEngagedCount = supportEngagedIds.length;
    const rate =
      confirmedCount === 0
        ? null
        : clampRate(supportEngagedCount / confirmedCount);

    return { confirmedCount, supportEngagedCount, rate };
  }

  async getCancellationRate(since: Date) {
    const [confirmedCount, cancelledCount] = await Promise.all([
      this.prisma.serviceRequest.count({
        where: {
          confirmedAt: { gte: since, not: null },
        },
      }),
      this.prisma.serviceRequest.count({
        where: {
          cancelledAt: { gte: since, not: null },
        },
      }),
    ]);

    const rate =
      confirmedCount === 0 ? null : clampRate(cancelledCount / confirmedCount);

    return { confirmedCount, cancelledCount, rate };
  }

  async getFeedbackSummary(since: Date) {
    const feedbackEntries = await this.prisma.requestFeedback.findMany({
      where: {
        recordedAt: { gte: since },
      },
      select: {
        satisfactionRating: true,
        reducedUncertainty: true,
      },
    });

    const sampleSize = feedbackEntries.length;

    if (sampleSize === 0) {
      return {
        sampleSize,
        averageSatisfaction: null,
        reducedUncertaintyRate: null,
      };
    }

    const sumSatisfaction = feedbackEntries.reduce(
      (total, entry) => total + entry.satisfactionRating,
      0,
    );
    const reducedAnswered = feedbackEntries.filter(
      (entry) => entry.reducedUncertainty !== null,
    );
    const reducedYesCount = reducedAnswered.filter(
      (entry) => entry.reducedUncertainty === true,
    ).length;

    return {
      sampleSize,
      averageSatisfaction: sumSatisfaction / sampleSize,
      reducedUncertaintyRate:
        reducedAnswered.length === 0
          ? null
          : clampRate(reducedYesCount / reducedAnswered.length),
    };
  }

  async getSummary(
    since: Date,
    promisedResponseMinutes: number = DEFAULT_PROMISED_RESPONSE_MINUTES,
  ): Promise<MeasurementSummary> {
    const [
      conversionRate,
      fulfillmentWindow,
      supportEngagementRate,
      cancellationRate,
      feedbackSummary,
    ] = await Promise.all([
      this.getConversionRate(since),
      this.getFulfillmentWindowCompliance(since, promisedResponseMinutes),
      this.getSupportEngagementRate(since),
      this.getCancellationRate(since),
      this.getFeedbackSummary(since),
    ]);

    return {
      since: since.toISOString(),
      generatedAt: new Date().toISOString(),
      conversionRate,
      fulfillmentWindow,
      supportEngagementRate,
      cancellationRate,
      feedbackSummary,
    };
  }
}
