import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from './requests.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RequestsService', () => {
  let service: RequestsService;
  let prisma: { serviceRequest: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { serviceRequest: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
  });

  it('returns empty items when no requests exist', async () => {
    prisma.serviceRequest.findMany.mockResolvedValue([]);
    const result = await service.findAllForCustomer('customer-1');
    expect(result).toEqual({ items: [] });
  });

  it('maps a PENDING request with no assigned handyman correctly', async () => {
    const pendingRequest = {
      id: 'req-1',
      title: 'Fix my sink',
      status: 'PENDING',
      estimatedTotal: null,
      createdAt: new Date('2026-05-01T10:00:00Z'),
      category: { name: 'Plumbing' },
      assignedHandyman: null,
    };
    prisma.serviceRequest.findMany.mockResolvedValue([pendingRequest]);

    const result = await service.findAllForCustomer('customer-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'req-1',
      title: 'Fix my sink',
      status: 'PENDING',
      estimatedTotal: null,
      categoryName: 'Plumbing',
      assignedHandymanDisplayName: null,
      createdAt: '2026-05-01T10:00:00.000Z',
    });
  });

  it('maps an ASSIGNED request with handyman profile correctly', async () => {
    const assignedRequest = {
      id: 'req-2',
      title: 'Fix wiring',
      status: 'ASSIGNED',
      estimatedTotal: null,
      createdAt: new Date('2026-05-02T09:00:00Z'),
      category: { name: 'Electrical' },
      assignedHandyman: {
        handymanProfile: { displayName: 'John Electrician' },
      },
    };
    prisma.serviceRequest.findMany.mockResolvedValue([assignedRequest]);

    const result = await service.findAllForCustomer('customer-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'req-2',
      status: 'ASSIGNED',
      assignedHandymanDisplayName: 'John Electrician',
    });
  });

  it('casts estimatedTotal Decimal to number', async () => {
    const requestWithDecimal = {
      id: 'req-3',
      title: 'Paint walls',
      status: 'COMPLETE',
      estimatedTotal: { toNumber: () => 150.5 },
      createdAt: new Date('2026-04-20T08:00:00Z'),
      category: { name: 'Painting' },
      assignedHandyman: null,
    };
    prisma.serviceRequest.findMany.mockResolvedValue([requestWithDecimal]);

    const result = await service.findAllForCustomer('customer-1');

    expect(result.items[0].estimatedTotal).toBe(150.5);
    expect(typeof result.items[0].estimatedTotal).toBe('number');
  });

  it('orders active statuses (PENDING/ASSIGNED/ON_THE_WAY/ARRIVED/WORKING) before historical', async () => {
    const oldComplete = {
      id: 'req-old',
      title: 'Old complete',
      status: 'COMPLETE',
      estimatedTotal: null,
      createdAt: new Date('2026-05-01T08:00:00Z'),
      category: { name: 'Plumbing' },
      assignedHandyman: null,
    };
    const newPending = {
      id: 'req-new-pending',
      title: 'Brand new request',
      status: 'PENDING',
      estimatedTotal: null,
      createdAt: new Date('2026-05-13T07:00:00Z'),
      category: { name: 'Cleaning' },
      assignedHandyman: null,
    };
    const oldAssigned = {
      id: 'req-old-assigned',
      title: 'Older assigned',
      status: 'ASSIGNED',
      estimatedTotal: null,
      createdAt: new Date('2026-05-10T07:00:00Z'),
      category: { name: 'Electrical' },
      assignedHandyman: {
        handymanProfile: { displayName: 'Alice' },
      },
    };
    // Prisma already orders by createdAt desc:
    prisma.serviceRequest.findMany.mockResolvedValue([newPending, oldAssigned, oldComplete]);

    const result = await service.findAllForCustomer('customer-1');

    expect(result.items.map((i) => i.id)).toEqual([
      'req-new-pending',
      'req-old-assigned',
      'req-old',
    ]);
  });
});
