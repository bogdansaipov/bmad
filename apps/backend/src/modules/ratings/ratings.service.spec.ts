import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RatingsService', () => {
  let service: RatingsService;
  let prisma: {
    serviceRequest: { findUnique: jest.Mock };
    requestRating: { findUnique: jest.Mock; create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      serviceRequest: { findUnique: jest.fn() },
      requestRating: { findUnique: jest.fn(), create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
  });

  describe('submitRating', () => {
    const validRequest = {
      id: 'req-1',
      customerId: 'cust-1',
      assignedHandymanId: 'hm-1',
      status: RequestStatus.COMPLETE,
    };

    const createdRating = {
      id: 'rating-1',
      requestId: 'req-1',
      customerId: 'cust-1',
      handymanId: 'hm-1',
      stars: 4,
      shortFeedback: 'Great work!',
      createdAt: new Date('2026-05-18T10:00:00Z'),
    };

    it('creates a rating for a completed request', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(validRequest);
      prisma.requestRating.findUnique.mockResolvedValue(null);
      prisma.requestRating.create.mockResolvedValue(createdRating);

      const result = await service.submitRating('cust-1', 'req-1', 4, 'Great work!');

      expect(result.id).toBe('rating-1');
      expect(result.stars).toBe(4);
      expect(result.shortFeedback).toBe('Great work!');
      expect(result.requestId).toBe('req-1');
    });

    it('creates a rating with null shortFeedback when omitted', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(validRequest);
      prisma.requestRating.findUnique.mockResolvedValue(null);
      prisma.requestRating.create.mockResolvedValue({ ...createdRating, shortFeedback: null });

      await service.submitRating('cust-1', 'req-1', 5, undefined);

      expect(prisma.requestRating.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ shortFeedback: null }),
      });
    });

    it('throws NotFoundException when request does not exist', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(null);

      await expect(service.submitRating('cust-1', 'req-missing', 4, undefined)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when customer does not own request', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue({ ...validRequest, customerId: 'cust-other' });

      await expect(service.submitRating('cust-1', 'req-1', 4, undefined)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when request is not complete', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue({ ...validRequest, status: RequestStatus.WORKING });

      await expect(service.submitRating('cust-1', 'req-1', 4, undefined)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when rating already exists (idempotency)', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(validRequest);
      prisma.requestRating.findUnique.mockResolvedValue({ id: 'existing-rating' });

      await expect(service.submitRating('cust-1', 'req-1', 4, undefined)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no handyman is assigned', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue({ ...validRequest, assignedHandymanId: null });

      await expect(service.submitRating('cust-1', 'req-1', 4, undefined)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRatingStatus', () => {
    it('returns hasRating: true with rating details when rated', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue({ customerId: 'cust-1' });
      prisma.requestRating.findUnique.mockResolvedValue({ stars: 5, shortFeedback: 'Excellent' });

      const result = await service.getRatingStatus('cust-1', 'req-1');

      expect(result.hasRating).toBe(true);
      expect(result.stars).toBe(5);
      expect(result.shortFeedback).toBe('Excellent');
    });

    it('returns hasRating: false with nulls when not rated', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue({ customerId: 'cust-1' });
      prisma.requestRating.findUnique.mockResolvedValue(null);

      const result = await service.getRatingStatus('cust-1', 'req-1');

      expect(result.hasRating).toBe(false);
      expect(result.stars).toBeNull();
      expect(result.shortFeedback).toBeNull();
    });

    it('throws NotFoundException when request does not exist', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(null);

      await expect(service.getRatingStatus('cust-1', 'req-missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when customer does not own request', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue({ customerId: 'cust-other' });

      await expect(service.getRatingStatus('cust-1', 'req-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
