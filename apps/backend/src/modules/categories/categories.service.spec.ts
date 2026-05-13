import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: { serviceCategory: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { serviceCategory: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('returns empty items when no categories exist', async () => {
    prisma.serviceCategory.findMany.mockResolvedValue([]);
    const result = await service.findAllActive();
    expect(result).toEqual({ items: [] });
  });

  it('returns only active categories ordered by name', async () => {
    const rows = [
      { id: 'cat-1', name: 'Cleaning', description: null },
      { id: 'cat-2', name: 'Plumbing', description: 'Pipes and drains' },
    ];
    prisma.serviceCategory.findMany.mockResolvedValue(rows);

    const result = await service.findAllActive();

    expect(prisma.serviceCategory.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ id: 'cat-1', name: 'Cleaning', description: null });
    expect(result.items[1]).toMatchObject({ id: 'cat-2', name: 'Plumbing', description: 'Pipes and drains' });
  });

  it('maps description: null correctly when description is null', async () => {
    prisma.serviceCategory.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'HVAC', description: null },
    ]);

    const result = await service.findAllActive();

    expect(result.items[0].description).toBeNull();
  });
});
