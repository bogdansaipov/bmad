import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from './requests.service';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

describe('RequestsService', () => {
  let service: RequestsService;
  let prisma: {
    serviceCategory: { findUnique: jest.Mock };
    requestImage: { findUnique: jest.Mock; update: jest.Mock };
    serviceRequest: { findMany: jest.Mock; create: jest.Mock };
  };
  let pricing: { calculateEstimate: jest.Mock };
  let matching: { createVisibleOffersForRequest: jest.Mock };

  beforeEach(async () => {
    prisma = {
      serviceCategory: { findUnique: jest.fn() },
      requestImage: { findUnique: jest.fn(), update: jest.fn() },
      serviceRequest: { findMany: jest.fn(), create: jest.fn() },
    };
    pricing = { calculateEstimate: jest.fn() };
    matching = { createVisibleOffersForRequest: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: MatchingService, useValue: matching },
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricing },
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

  it('creates a pending request with the pricing snapshot', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      isActive: true,
      name: 'Plumbing',
    });
    pricing.calculateEstimate.mockReturnValue({
      categoryId: 'cat-1',
      baseFee: 30,
      categoryFee: 20,
      partsAllowance: 15,
      estimatedTotal: 65,
      disclaimer: 'Estimate disclaimer',
    });
    prisma.serviceRequest.create.mockResolvedValue({
      id: 'req-123',
      status: 'PENDING',
      estimatedTotal: { toNumber: () => 65 },
      createdAt: new Date('2026-05-14T10:00:00Z'),
      category: { name: 'Plumbing' },
    });

    const result = await service.create('customer-1', {
      categoryId: 'cat-1',
      title: 'Fix my sink',
      description: 'Leaking',
      locationLat: 41.3,
      locationLng: 69.2,
    });

    expect(pricing.calculateEstimate).toHaveBeenCalledWith('cat-1');
    expect(matching.createVisibleOffersForRequest).toHaveBeenCalledWith({
      requestId: 'req-123',
      categoryId: 'cat-1',
      locationLat: 41.3,
      locationLng: 69.2,
    });
    expect(prisma.serviceRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        customerId: 'customer-1',
        categoryId: 'cat-1',
        title: 'Fix my sink',
        status: 'PENDING',
        estimatedTotal: 65,
      }),
    }));
    expect(result).toEqual({
      id: 'req-123',
      status: 'PENDING',
      estimatedTotal: 65,
      categoryName: 'Plumbing',
      createdAt: '2026-05-14T10:00:00.000Z',
    });
  });

  it('throws NotFoundException when the category does not exist', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue(null);

    await expect(service.create('customer-1', {
      categoryId: 'missing-cat',
      title: 'Fix my sink',
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the category is inactive', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      isActive: false,
      name: 'Plumbing',
    });

    await expect(service.create('customer-1', {
      categoryId: 'cat-1',
      title: 'Fix my sink',
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when the image belongs to a different uploader', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      isActive: true,
      name: 'Plumbing',
    });
    prisma.requestImage.findUnique.mockResolvedValue({
      id: 'img-1',
      uploaderId: 'other-customer',
    });

    await expect(service.create('customer-1', {
      categoryId: 'cat-1',
      title: 'Fix my sink',
      imageId: 'img-1',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('links the uploaded image when imageId is provided', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      isActive: true,
      name: 'Plumbing',
    });
    prisma.requestImage.findUnique.mockResolvedValue({
      id: 'img-1',
      uploaderId: 'customer-1',
    });
    pricing.calculateEstimate.mockReturnValue({
      categoryId: 'cat-1',
      baseFee: 30,
      categoryFee: 20,
      partsAllowance: 15,
      estimatedTotal: 65,
      disclaimer: 'Estimate disclaimer',
    });
    prisma.serviceRequest.create.mockResolvedValue({
      id: 'req-456',
      status: 'PENDING',
      estimatedTotal: { toNumber: () => 65 },
      createdAt: new Date('2026-05-14T11:00:00Z'),
      category: { name: 'Plumbing' },
    });

    await service.create('customer-1', {
      categoryId: 'cat-1',
      title: 'Fix my sink',
      imageId: 'img-1',
    });

    expect(prisma.requestImage.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: { requestId: 'req-456' },
    });
    expect(matching.createVisibleOffersForRequest).toHaveBeenCalledWith({
      requestId: 'req-456',
      categoryId: 'cat-1',
      locationLat: null,
      locationLng: null,
    });
  });

  it('does not link an image when imageId is absent', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      isActive: true,
      name: 'Plumbing',
    });
    pricing.calculateEstimate.mockReturnValue({
      categoryId: 'cat-1',
      baseFee: 30,
      categoryFee: 20,
      partsAllowance: 15,
      estimatedTotal: 65,
      disclaimer: 'Estimate disclaimer',
    });
    prisma.serviceRequest.create.mockResolvedValue({
      id: 'req-789',
      status: 'PENDING',
      estimatedTotal: { toNumber: () => 65 },
      createdAt: new Date('2026-05-14T11:30:00Z'),
      category: { name: 'Plumbing' },
    });

    await service.create('customer-1', {
      categoryId: 'cat-1',
      title: 'Fix my sink',
    });

    expect(prisma.requestImage.update).not.toHaveBeenCalled();
    expect(matching.createVisibleOffersForRequest).toHaveBeenCalledWith({
      requestId: 'req-789',
      categoryId: 'cat-1',
      locationLat: null,
      locationLng: null,
    });
  });
});
