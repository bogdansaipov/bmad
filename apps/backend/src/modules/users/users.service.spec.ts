import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    handymanProfile: { findUnique: jest.Mock };
    $transaction: jest.Mock;
    _tx: {
      serviceCategory: { findMany: jest.Mock };
      handymanCategoryPreference: { deleteMany: jest.Mock; createMany: jest.Mock };
      handymanProfile: { update: jest.Mock };
    };
  };

  beforeEach(async () => {
    const txClient = {
      serviceCategory: { findMany: jest.fn() },
      handymanCategoryPreference: { deleteMany: jest.fn(), createMany: jest.fn() },
      handymanProfile: { update: jest.fn() },
    };

    prisma = {
      handymanProfile: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cb: (tx: typeof txClient) => unknown) => cb(txClient)),
      _tx: txClient,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getHandymanProfile', () => {
    it('returns profile marked incomplete when no categories and no radius are set', async () => {
      prisma.handymanProfile.findUnique.mockResolvedValue({
        id: 'h-1',
        displayName: 'Jane H.',
        availabilityStatus: 'offline',
        serviceRadiusKm: null,
        categoryPreferences: [],
      });

      const result = await service.getHandymanProfile('user-1');

      expect(prisma.handymanProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result).toEqual({
        displayName: 'Jane H.',
        availabilityStatus: 'offline',
        serviceRadiusKm: null,
        categories: [],
        isProfileComplete: false,
      });
    });

    it('returns profile marked complete when categories and radius are set', async () => {
      prisma.handymanProfile.findUnique.mockResolvedValue({
        id: 'h-2',
        displayName: 'Bob',
        availabilityStatus: 'offline',
        serviceRadiusKm: 12.5,
        categoryPreferences: [
          { category: { id: 'cat-1', name: 'Plumbing' } },
          { category: { id: 'cat-2', name: 'Electrical' } },
        ],
      });

      const result = await service.getHandymanProfile('user-2');

      expect(result).toEqual({
        displayName: 'Bob',
        availabilityStatus: 'offline',
        serviceRadiusKm: 12.5,
        categories: [
          { categoryId: 'cat-1', categoryName: 'Plumbing' },
          { categoryId: 'cat-2', categoryName: 'Electrical' },
        ],
        isProfileComplete: true,
      });
    });

    it('throws NotFoundException when no handyman profile exists', async () => {
      prisma.handymanProfile.findUnique.mockResolvedValue(null);

      await expect(service.getHandymanProfile('missing-user')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateHandymanProfile', () => {
    function setupValidProfile() {
      prisma.handymanProfile.findUnique.mockResolvedValue({ id: 'h-1' });
    }

    it('throws NotFoundException when no handyman profile exists', async () => {
      prisma.handymanProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateHandymanProfile('missing-user', {
          serviceRadiusKm: 10,
          categoryIds: ['cat-1'],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when a selected category does not exist', async () => {
      setupValidProfile();
      prisma._tx.serviceCategory.findMany.mockResolvedValue([
        { id: 'cat-1', isActive: true },
      ]);

      await expect(
        service.updateHandymanProfile('user-1', {
          serviceRadiusKm: 10,
          categoryIds: ['cat-1', 'cat-missing'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when a selected category is inactive', async () => {
      setupValidProfile();
      prisma._tx.serviceCategory.findMany.mockResolvedValue([
        { id: 'cat-1', isActive: true },
        { id: 'cat-2', isActive: false },
      ]);

      await expect(
        service.updateHandymanProfile('user-1', {
          serviceRadiusKm: 10,
          categoryIds: ['cat-1', 'cat-2'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('replaces preferences transactionally and returns the transactional state', async () => {
      setupValidProfile();
      prisma._tx.serviceCategory.findMany.mockResolvedValue([
        { id: 'cat-1', isActive: true },
        { id: 'cat-2', isActive: true },
      ]);
      prisma._tx.handymanProfile.update.mockResolvedValue({
        id: 'h-1',
        displayName: 'Jane H.',
        availabilityStatus: 'offline',
        serviceRadiusKm: 15,
        categoryPreferences: [
          { category: { id: 'cat-1', name: 'Plumbing' } },
          { category: { id: 'cat-2', name: 'Electrical' } },
        ],
      });

      const result = await service.updateHandymanProfile('user-1', {
        serviceRadiusKm: 15,
        categoryIds: ['cat-1', 'cat-2'],
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma._tx.serviceCategory.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['cat-1', 'cat-2'] } },
        select: { id: true, isActive: true },
      });
      expect(prisma._tx.handymanCategoryPreference.deleteMany).toHaveBeenCalledWith({
        where: { handymanProfileId: 'h-1' },
      });
      expect(prisma._tx.handymanCategoryPreference.createMany).toHaveBeenCalledWith({
        data: [
          { handymanProfileId: 'h-1', categoryId: 'cat-1' },
          { handymanProfileId: 'h-1', categoryId: 'cat-2' },
        ],
      });
      expect(prisma._tx.handymanProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'h-1' },
          data: { serviceRadiusKm: 15 },
        }),
      );
      expect(result).toEqual({
        displayName: 'Jane H.',
        availabilityStatus: 'offline',
        serviceRadiusKm: 15,
        categories: [
          { categoryId: 'cat-1', categoryName: 'Plumbing' },
          { categoryId: 'cat-2', categoryName: 'Electrical' },
        ],
        isProfileComplete: true,
      });
    });

    it('deduplicates category ids before validation and insert', async () => {
      setupValidProfile();
      prisma._tx.serviceCategory.findMany.mockResolvedValue([
        { id: 'cat-1', isActive: true },
      ]);
      prisma._tx.handymanProfile.update.mockResolvedValue({
        id: 'h-1',
        displayName: 'Jane H.',
        availabilityStatus: 'offline',
        serviceRadiusKm: 5,
        categoryPreferences: [{ category: { id: 'cat-1', name: 'Plumbing' } }],
      });

      await service.updateHandymanProfile('user-1', {
        serviceRadiusKm: 5,
        categoryIds: ['cat-1', 'cat-1'],
      });

      expect(prisma._tx.serviceCategory.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['cat-1'] } },
        select: { id: true, isActive: true },
      });
      expect(prisma._tx.handymanCategoryPreference.createMany).toHaveBeenCalledWith({
        data: [{ handymanProfileId: 'h-1', categoryId: 'cat-1' }],
      });
    });

    it('translates a concurrent P2002 unique-constraint violation into 409 Conflict', async () => {
      setupValidProfile();
      prisma._tx.serviceCategory.findMany.mockResolvedValue([
        { id: 'cat-1', isActive: true },
      ]);
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma._tx.handymanCategoryPreference.createMany.mockRejectedValue(p2002);

      await expect(
        service.updateHandymanProfile('user-1', {
          serviceRadiusKm: 5,
          categoryIds: ['cat-1'],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
