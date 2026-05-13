import { Injectable } from '@nestjs/common';
import { Prisma, RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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
}
