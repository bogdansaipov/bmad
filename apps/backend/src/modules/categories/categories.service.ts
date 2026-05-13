import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryListResponseDto, ServiceCategoryDto } from './dto/category-list-response.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive(): Promise<CategoryListResponseDto> {
    const rows = await this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });

    const items: ServiceCategoryDto[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
    }));

    return { items };
  }
}
