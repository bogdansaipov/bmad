import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService, calculateDistanceKm } from './matching.service';

describe('MatchingService', () => {
  let service: MatchingService;
  let prisma: {
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('calculates a zero-ish distance for identical points', () => {
    expect(calculateDistanceKm({ lat: 41.2995, lng: 69.2401 }, { lat: 41.2995, lng: 69.2401 })).toBe(
      0,
    );
  });

  it('creates offers only for handymen within the configured radius', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        userId: 'handyman-near',
        serviceRadiusKm: 10,
        baseLat: 41.3,
        baseLng: 69.24,
      },
      {
        userId: 'handyman-far',
        serviceRadiusKm: 1,
        baseLat: 41.4,
        baseLng: 69.5,
      },
    ]);

    await service.createVisibleOffersForRequest({
      requestId: '11111111-1111-1111-1111-111111111111',
      categoryId: 'cat-1',
      locationLat: 41.2995,
      locationLng: 69.2401,
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('does not create offers when request coordinates are missing', async () => {
    await service.createVisibleOffersForRequest({
      requestId: 'req-1',
      categoryId: 'cat-1',
      locationLat: null,
      locationLng: null,
    });

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('returns empty items for an incomplete handyman profile', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'profile-1',
        serviceRadiusKm: 10,
        baseLat: null,
        baseLng: null,
      },
    ]);

    await expect(service.findAvailableOffersForHandyman('handyman-1')).resolves.toEqual({
      items: [],
    });
  });

  it('maps pending visible offers into a customer-safe feed', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 'profile-1',
          serviceRadiusKm: 12,
          baseLat: 41.3,
          baseLng: 69.24,
        },
      ])
      .mockResolvedValueOnce([
        {
          requestId: '11111111-1111-1111-1111-111111111111',
          categoryName: 'Plumbing',
          locationLat: 41.2995,
          locationLng: 69.2401,
          estimatedTotal: 65,
          title: 'Leaking sink',
          description: 'Kitchen tap keeps dripping overnight and needs a quick fix.',
          createdAt: new Date('2026-05-14T12:00:00Z'),
        },
      ]);

    const result = await service.findAvailableOffersForHandyman('handyman-1');

    expect(result.items).toEqual([
      expect.objectContaining({
        requestId: '11111111-1111-1111-1111-111111111111',
        categoryName: 'Plumbing',
        estimatedTotal: 65,
        shortDescription: 'Kitchen tap keeps dripping overnight and needs a quick fix.',
        roughAreaLabel: 'Approx. 41.3, 69.2 area',
        createdAt: '2026-05-14T12:00:00.000Z',
      }),
    ]);
    expect(result.items[0].distanceKm).toBeGreaterThanOrEqual(0);
  });
});
