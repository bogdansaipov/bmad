import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { HANDYMAN_AVAILABILITY_STATUS, JOB_OFFER_STATUS } from '@handrix/contracts';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActiveJobResponseDto } from './dto/active-job-response.dto';
import { HandymanJobFeedItemDto, HandymanJobFeedResponseDto } from './dto/handyman-job-feed-response.dto';
import { HandymanJobHistoryItemDto, HandymanJobHistoryResponseDto } from './dto/handyman-job-history-response.dto';

function mapShortDescription(title: string, description: string | null): string {
  const source = description?.trim() ? description : title;
  return source.length <= 140 ? source : `${source.slice(0, 137)}...`;
}

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.min(1, Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async findAndOfferHandymen(requestId: string): Promise<number> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { categoryId: true, locationLat: true, locationLng: true },
    });

    if (!request) return 0;

    const candidates = await this.prisma.handymanProfile.findMany({
      where: {
        availabilityStatus: HANDYMAN_AVAILABILITY_STATUS.ONLINE,
        categoryPreferences: { some: { categoryId: request.categoryId } },
      },
      select: {
        id: true,
        baseLocationLat: true,
        baseLocationLng: true,
        serviceRadiusKm: true,
      },
    });

    const eligible = candidates.filter((hp) => {
      if (hp.baseLocationLat == null || hp.baseLocationLng == null) {
        return true; // MVP fallback: include when no base location set
      }
      if (request.locationLat == null || request.locationLng == null) {
        return true;
      }
      const dist = this.haversineKm(
        hp.baseLocationLat,
        hp.baseLocationLng,
        request.locationLat,
        request.locationLng,
      );
      return hp.serviceRadiusKm == null || dist <= hp.serviceRadiusKm;
    });

    if (eligible.length === 0) return 0;

    const result = await this.prisma.jobOfferVisibility.createMany({
      data: eligible.map((hp) => ({
        requestId,
        handymanProfileId: hp.id,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  async findJobHistoryForHandyman(userId: string): Promise<HandymanJobHistoryResponseDto> {
    const handymanProfile = await this.prisma.handymanProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!handymanProfile) return [];

    const offers = await this.prisma.jobOfferVisibility.findMany({
      where: {
        handymanProfileId: handymanProfile.id,
        offerStatus: { notIn: [JOB_OFFER_STATUS.PENDING, JOB_OFFER_STATUS.HIDDEN] },
      },
      include: {
        request: {
          include: { category: { select: { name: true } } },
        },
      },
      orderBy: [
        { respondedAt: { sort: 'desc', nulls: 'last' } },
        { offeredAt: 'desc' },
      ],
    });

    return offers.map((offer): HandymanJobHistoryItemDto => ({
      offerId: offer.id,
      requestId: offer.request.id,
      offerStatus: offer.offerStatus,
      requestTitle: offer.request.title,
      requestDescription: offer.request.description ?? '',
      categoryName: offer.request.category.name,
      estimatedTotal: offer.request.estimatedTotal != null ? offer.request.estimatedTotal.toNumber() : 0,
      requestStatus: offer.request.status,
      offeredAt: offer.offeredAt.toISOString(),
      respondedAt: offer.respondedAt?.toISOString() ?? null,
    }));
  }

  private readonly VALID_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus>> = {
    [RequestStatus.ASSIGNED]: RequestStatus.ON_THE_WAY,
    [RequestStatus.ON_THE_WAY]: RequestStatus.ARRIVED,
    [RequestStatus.ARRIVED]: RequestStatus.WORKING,
    [RequestStatus.WORKING]: RequestStatus.COMPLETE,
  };

  private readonly ACTIVE_STATUSES = new Set<RequestStatus>([
    RequestStatus.ASSIGNED,
    RequestStatus.ON_THE_WAY,
    RequestStatus.ARRIVED,
    RequestStatus.WORKING,
  ]);

  async getActiveJobForHandyman(handymanId: string, requestId: string): Promise<ActiveJobResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { category: { select: { name: true } } },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.assignedHandymanId !== handymanId) throw new ForbiddenException('Access denied');
    if (!this.ACTIVE_STATUSES.has(request.status)) {
      throw new BadRequestException('Request is not in an active state');
    }

    return {
      requestId: request.id,
      title: request.title,
      description: request.description ?? null,
      status: request.status,
      categoryName: request.category?.name ?? 'Unknown',
      estimatedTotal: request.estimatedTotal?.toNumber() ?? null,
      locationLat: request.locationLat ?? null,
      locationLng: request.locationLng ?? null,
      createdAt: request.createdAt.toISOString(),
    };
  }

  async updateJobStatus(
    handymanId: string,
    requestId: string,
    newStatusStr: string,
  ): Promise<{ requestId: string; status: string }> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, assignedHandymanId: true },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.assignedHandymanId !== handymanId) throw new ForbiddenException('Access denied');

    const expectedNext = this.VALID_TRANSITIONS[request.status];
    const newStatus = newStatusStr as RequestStatus;
    if (!expectedNext || expectedNext !== newStatus) {
      throw new BadRequestException(
        `Invalid transition: ${request.status} → ${newStatusStr}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          ...(newStatus === RequestStatus.COMPLETE ? { completedAt: new Date() } : {}),
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          status: newStatus,
          actorType: 'handyman',
          actorId: handymanId,
        },
      });
    });

    return { requestId, status: newStatus };
  }

  async postHandymanLocation(
    handymanId: string,
    requestId: string,
    lat: number,
    lng: number,
  ): Promise<{ id: string; recordedAt: string }> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, assignedHandymanId: true, status: true },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.assignedHandymanId !== handymanId) throw new ForbiddenException('Access denied');
    if (!this.ACTIVE_STATUSES.has(request.status)) {
      throw new BadRequestException('Cannot post location for non-active request');
    }

    const loc = await this.prisma.handymanLocationUpdate.create({
      data: { requestId, handymanId, lat, lng },
    });

    return { id: loc.id, recordedAt: loc.recordedAt.toISOString() };
  }

  async findAvailableOffersForHandyman(userId: string): Promise<HandymanJobFeedResponseDto> {
    const handymanProfile = await this.prisma.handymanProfile.findUnique({
      where: { userId },
      select: { id: true, baseLocationLat: true, baseLocationLng: true, serviceRadiusKm: true },
    });

    if (!handymanProfile) return [];

    const offers = await this.prisma.jobOfferVisibility.findMany({
      where: { handymanProfileId: handymanProfile.id, offerStatus: JOB_OFFER_STATUS.PENDING },
      include: {
        request: {
          include: { category: { select: { name: true } } },
        },
      },
      orderBy: { offeredAt: 'desc' },
    });

    return offers.map((offer): HandymanJobFeedItemDto => {
      const req = offer.request;
      let distanceKm: number | null = null;
      if (
        handymanProfile.baseLocationLat != null &&
        handymanProfile.baseLocationLng != null &&
        req.locationLat != null &&
        req.locationLng != null
      ) {
        distanceKm = Math.round(
          this.haversineKm(
            handymanProfile.baseLocationLat,
            handymanProfile.baseLocationLng,
            req.locationLat,
            req.locationLng,
          ) * 10,
        ) / 10;
      }

      return {
        offerId: offer.id,
        requestId: req.id,
        categoryName: req.category.name,
        distanceKm,
        roughArea: null,
        estimatedTotal: req.estimatedTotal != null ? req.estimatedTotal.toNumber() : 0,
        shortDescription: mapShortDescription(req.title, req.description),
        offeredAt: offer.offeredAt.toISOString(),
      };
    });
  }
}
