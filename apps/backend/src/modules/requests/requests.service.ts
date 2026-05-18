import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { RequestTrackingResponseDto } from './dto/request-tracking-response.dto';

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
  rating: { select: { id: true } },
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
  dto.hasRating = r.rating != null;
  dto.createdAt = r.createdAt.toISOString();
  return dto;
}

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

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

    const created = await this.prisma.$transaction(async (tx) => {
      const req = await tx.serviceRequest.create({
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
      await tx.requestStatusHistory.create({
        data: {
          requestId: req.id,
          status: RequestStatus.PENDING,
          actorType: 'customer',
          actorId: customerId,
        },
      });
      return req;
    });

    if (dto.imageId) {
      await this.prisma.requestImage.update({
        where: { id: dto.imageId },
        data: { requestId: created.id },
      });
    }

    void this.matching.findAndOfferHandymen(created.id).catch((err) =>
      this.logger.error(err),
    );

    const response = new CreateRequestResponseDto();
    response.id = created.id;
    response.status = created.status;
    response.estimatedTotal = created.estimatedTotal != null ? created.estimatedTotal.toNumber() : null;
    response.categoryName = created.category.name;
    response.createdAt = created.createdAt.toISOString();
    return response;
  }

  async getTrackingForCustomer(customerId: string, requestId: string): Promise<RequestTrackingResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        category: { select: { name: true } },
        assignedHandyman: {
          include: { handymanProfile: { select: { displayName: true } } },
        },
      },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.customerId !== customerId) throw new ForbiddenException('Access denied');

    let latestLocation: { lat: number; lng: number; recordedAt: Date } | null = null;
    if (request.assignedHandymanId) {
      const loc = await this.prisma.handymanLocationUpdate.findFirst({
        where: { requestId: request.id },
        orderBy: { recordedAt: 'desc' },
      });
      if (loc) latestLocation = loc;
    }

    return {
      requestId: request.id,
      title: request.title,
      status: request.status,
      categoryName: request.category?.name ?? 'Unknown',
      estimatedTotal: request.estimatedTotal?.toNumber() ?? null,
      description: request.description ?? null,
      locationLat: request.locationLat ?? null,
      locationLng: request.locationLng ?? null,
      assignedHandymanDisplayName:
        request.assignedHandyman?.handymanProfile?.displayName ?? null,
      handymanLat: latestLocation?.lat ?? null,
      handymanLng: latestLocation?.lng ?? null,
      handymanLocationAt: latestLocation?.recordedAt.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
    };
  }
}
