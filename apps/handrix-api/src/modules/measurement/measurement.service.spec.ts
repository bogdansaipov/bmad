import { OBSERVABILITY_EVENT_NAMES } from '@handrix/shared-contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { MeasurementService } from './measurement.service';

type PrismaMock = {
  observabilityEvent: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
  serviceRequest: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
  requestFeedback: {
    findMany: jest.Mock;
  };
};

function createPrismaMock(): PrismaMock {
  return {
    observabilityEvent: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    serviceRequest: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    requestFeedback: {
      findMany: jest.fn(),
    },
  };
}

function makeService(prismaMock: PrismaMock) {
  return new MeasurementService(prismaMock as unknown as PrismaService);
}

describe('MeasurementService', () => {
  const since = new Date('2026-04-01T00:00:00.000Z');

  describe('getConversionRate', () => {
    it('computes confirmed / flow.started ratio', async () => {
      const prisma = createPrismaMock();
      prisma.observabilityEvent.count.mockResolvedValueOnce(100);
      prisma.serviceRequest.count.mockResolvedValueOnce(25);

      const service = makeService(prisma);

      const result = await service.getConversionRate(since);

      expect(prisma.observabilityEvent.count).toHaveBeenCalledWith({
        where: {
          eventName: OBSERVABILITY_EVENT_NAMES.flowStarted,
          occurredAt: { gte: since },
        },
      });
      expect(result).toEqual({
        flowStartedCount: 100,
        confirmedCount: 25,
        rate: 0.25,
      });
    });

    it('returns null rate when no flows have started', async () => {
      const prisma = createPrismaMock();
      prisma.observabilityEvent.count.mockResolvedValueOnce(0);
      prisma.serviceRequest.count.mockResolvedValueOnce(0);

      const service = makeService(prisma);

      const result = await service.getConversionRate(since);

      expect(result.rate).toBeNull();
    });

    it('clamps rate to 1 when confirmed exceeds flow.started count', async () => {
      const prisma = createPrismaMock();
      prisma.observabilityEvent.count.mockResolvedValueOnce(10);
      prisma.serviceRequest.count.mockResolvedValueOnce(20);

      const service = makeService(prisma);

      const result = await service.getConversionRate(since);

      expect(result.rate).toBe(1);
    });
  });

  describe('getFulfillmentWindowCompliance', () => {
    it('counts requests that fulfilled within the promised window', async () => {
      const prisma = createPrismaMock();
      prisma.serviceRequest.findMany.mockResolvedValueOnce([
        {
          confirmedAt: new Date('2026-04-10T12:00:00Z'),
          fulfilledAt: new Date('2026-04-10T12:30:00Z'),
        },
        {
          confirmedAt: new Date('2026-04-10T12:00:00Z'),
          fulfilledAt: new Date('2026-04-10T13:05:00Z'),
        },
        {
          confirmedAt: new Date('2026-04-10T12:00:00Z'),
          fulfilledAt: new Date('2026-04-10T12:59:59Z'),
        },
      ]);

      const service = makeService(prisma);

      const result = await service.getFulfillmentWindowCompliance(since, 60);

      expect(result).toEqual({
        sampleSize: 3,
        withinWindowCount: 2,
        compliance: 2 / 3,
        promisedResponseMinutes: 60,
      });
    });

    it('excludes entries with negative fulfillment duration from withinWindow count', async () => {
      const prisma = createPrismaMock();
      prisma.serviceRequest.findMany.mockResolvedValueOnce([
        {
          confirmedAt: new Date('2026-04-10T12:30:00Z'),
          fulfilledAt: new Date('2026-04-10T12:00:00Z'),
        },
        {
          confirmedAt: new Date('2026-04-10T12:00:00Z'),
          fulfilledAt: new Date('2026-04-10T12:30:00Z'),
        },
      ]);

      const service = makeService(prisma);

      const result = await service.getFulfillmentWindowCompliance(since, 60);

      expect(result.sampleSize).toBe(2);
      expect(result.withinWindowCount).toBe(1);
    });
  });

  describe('getFeedbackSummary', () => {
    it('summarizes satisfaction and reducedUncertainty responses', async () => {
      const prisma = createPrismaMock();
      prisma.requestFeedback.findMany.mockResolvedValueOnce([
        { satisfactionRating: 5, reducedUncertainty: true },
        { satisfactionRating: 3, reducedUncertainty: false },
        { satisfactionRating: 4, reducedUncertainty: null },
      ]);

      const service = makeService(prisma);

      const result = await service.getFeedbackSummary(since);

      expect(result.sampleSize).toBe(3);
      expect(result.averageSatisfaction).toBeCloseTo(4);
      expect(result.reducedUncertaintyRate).toBe(0.5);
    });

    it('returns null aggregates for empty feedback', async () => {
      const prisma = createPrismaMock();
      prisma.requestFeedback.findMany.mockResolvedValueOnce([]);

      const service = makeService(prisma);

      const result = await service.getFeedbackSummary(since);

      expect(result).toEqual({
        sampleSize: 0,
        averageSatisfaction: null,
        reducedUncertaintyRate: null,
      });
    });
  });

  describe('getSupportEngagementRate', () => {
    it('uses distinct public IDs for the engagement denominator', async () => {
      const prisma = createPrismaMock();
      prisma.serviceRequest.count.mockResolvedValueOnce(10);
      prisma.observabilityEvent.findMany.mockResolvedValueOnce([
        { publicId: 'hrx_1' },
        { publicId: 'hrx_2' },
        { publicId: 'hrx_3' },
      ]);

      const service = makeService(prisma);

      const result = await service.getSupportEngagementRate(since);

      expect(prisma.observabilityEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventName: OBSERVABILITY_EVENT_NAMES.supportContactInitiated,
          occurredAt: { gte: since },
          publicId: { not: null },
        },
        select: { publicId: true },
        distinct: ['publicId'],
      });
      expect(result).toEqual({
        confirmedCount: 10,
        supportEngagedCount: 3,
        rate: 0.3,
      });
    });

    it('clamps rate to 1 when engagement exceeds confirmed count', async () => {
      const prisma = createPrismaMock();
      prisma.serviceRequest.count.mockResolvedValueOnce(2);
      prisma.observabilityEvent.findMany.mockResolvedValueOnce([
        { publicId: 'hrx_1' },
        { publicId: 'hrx_2' },
        { publicId: 'hrx_3' },
      ]);

      const service = makeService(prisma);

      const result = await service.getSupportEngagementRate(since);

      expect(result.rate).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('aggregates every measurement into a single payload', async () => {
      const prisma = createPrismaMock();
      prisma.observabilityEvent.count.mockResolvedValue(5);
      prisma.serviceRequest.count.mockResolvedValue(4);
      prisma.serviceRequest.findMany.mockResolvedValue([]);
      prisma.observabilityEvent.findMany.mockResolvedValue([]);
      prisma.requestFeedback.findMany.mockResolvedValue([]);

      const service = makeService(prisma);

      const summary = await service.getSummary(since, 60);

      expect(summary.conversionRate.flowStartedCount).toBe(5);
      expect(summary.conversionRate.confirmedCount).toBe(4);
      expect(summary.fulfillmentWindow.promisedResponseMinutes).toBe(60);
      expect(summary.since).toBe(since.toISOString());
      expect(typeof summary.generatedAt).toBe('string');
      expect(summary).not.toHaveProperty('timeToConfirmation');
    });
  });
});
