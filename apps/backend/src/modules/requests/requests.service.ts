import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RequestStatus } from '@prisma/client';
import { MatchingService } from '../matching/matching.service';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { CreateRequestResponseDto } from './dto/create-request-response.dto';
import {
  CustomerRequestListResponseDto,
  ServiceRequestListItemDto,
} from './dto/customer-request-list-response.dto';

const ACTIVE_STATUSES: ReadonlySet<RequestStatus> = new Set([
  RequestStatus.PENDING,
  RequestStatus.ASSIGNED,
  RequestStatus.ON_THE_WAY,
  RequestStatus.ARRIVED,
  RequestStatus.WORKING,
]);

const includeRelations = {
  category: { select: { name: true } },
  assignedHandyman: {
    include: { handymanProfile: { select: { displayName: true } } },
  },
} as const;

type RequestWithRelations = Prisma.ServiceRequestGetPayload<{
  include: typeof includeRelations;
}>;

function mapToDto(r: RequestWithRelations): ServiceRequestListItemDto {
  const dto = new ServiceRequestListItemDto();
  dto.id = r.id;
  dto.title = r.title;
  dto.status = r.status;
  dto.estimatedTotal = r.estimatedTotal != null ? r.estimatedTotal.toNumber() : null;
  dto.categoryName = r.category.name;
  dto.assignedHandymanDisplayName = r.assignedHandyman?.handymanProfile?.displayName ?? null;
  dto.createdAt = r.createdAt.toISOString();
  return dto;
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly matching: MatchingService,
  ) {}

  async findAllForCustomer(customerId: string): Promise<CustomerRequestListResponseDto> {
    const requests = await this.prisma.serviceRequest.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: includeRelations,
    });

    const active: RequestWithRelations[] = [];
    const historical: RequestWithRelations[] = [];
    for (const r of requests) {
      if (ACTIVE_STATUSES.has(r.status)) {
        active.push(r);
      } else {
        historical.push(r);
      }
    }

    const dto = new CustomerRequestListResponseDto();
    dto.items = [...active, ...historical].map(mapToDto);
    return dto;
  }

  async create(customerId: string, dto: CreateRequestDto): Promise<CreateRequestResponseDto> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
      select: { id: true, isActive: true, name: true },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Category not found or inactive');
    }

    if (dto.imageId) {
      const image = await this.prisma.requestImage.findUnique({
        where: { id: dto.imageId },
        select: { id: true, uploaderId: true },
      });

      if (!image || image.uploaderId !== customerId) {
        throw new BadRequestException('Invalid image');
      }
    }

    const estimate = this.pricing.calculateEstimate(dto.categoryId);

    const created = await this.prisma.serviceRequest.create({
      data: {
        customerId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description ?? null,
        locationLat: dto.locationLat ?? null,
        locationLng: dto.locationLng ?? null,
        estimatedTotal: estimate.estimatedTotal,
        pricingExplanationSnapshot: estimate as unknown as Prisma.InputJsonValue,
        status: RequestStatus.PENDING,
      },
      include: {
        category: { select: { name: true } },
      },
    });

    if (dto.imageId) {
      await this.prisma.requestImage.update({
        where: { id: dto.imageId },
        data: { requestId: created.id },
      });
    }

    await this.matching.createVisibleOffersForRequest({
      requestId: created.id,
      categoryId: dto.categoryId,
      locationLat: dto.locationLat ?? null,
      locationLng: dto.locationLng ?? null,
    });

    const response = new CreateRequestResponseDto();
    response.id = created.id;
    response.status = created.status;
    response.estimatedTotal = created.estimatedTotal != null ? created.estimatedTotal.toNumber() : null;
    response.categoryName = created.category.name;
    response.createdAt = created.createdAt.toISOString();
    return response;
  }
}
