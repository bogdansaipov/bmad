import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitRating(
    customerId: string,
    requestId: string,
    stars: number,
    shortFeedback: string | undefined,
  ): Promise<{ id: string; requestId: string; stars: number; shortFeedback: string | null; createdAt: string }> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, customerId: true, assignedHandymanId: true, status: true },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.customerId !== customerId) throw new ForbiddenException('Access denied');
    if (request.status !== RequestStatus.COMPLETE) {
      throw new BadRequestException('Rating can only be submitted for completed requests');
    }
    if (!request.assignedHandymanId) {
      throw new BadRequestException('No handyman assigned to this request');
    }

    const existing = await this.prisma.requestRating.findUnique({
      where: { requestId },
    });
    if (existing) {
      throw new BadRequestException('Rating already submitted for this request');
    }

    let rating;
    try {
      rating = await this.prisma.requestRating.create({
        data: {
          requestId,
          customerId,
          handymanId: request.assignedHandymanId,
          stars,
          shortFeedback: shortFeedback ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        this.logger.warn({ event: 'rating.duplicate', requestId });
        throw new BadRequestException('Rating already submitted for this request');
      }
      throw err;
    }

    this.logger.log({ event: 'rating.submitted', requestId, handymanId: request.assignedHandymanId, stars });
    return {
      id: rating.id,
      requestId: rating.requestId,
      stars: rating.stars,
      shortFeedback: rating.shortFeedback,
      createdAt: rating.createdAt.toISOString(),
    };
  }

  async getRatingStatus(
    customerId: string,
    requestId: string,
  ): Promise<{ requestId: string; hasRating: boolean; stars: number | null; shortFeedback: string | null }> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { customerId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.customerId !== customerId) throw new ForbiddenException('Access denied');

    const rating = await this.prisma.requestRating.findUnique({
      where: { requestId },
      select: { stars: true, shortFeedback: true },
    });

    return {
      requestId,
      hasRating: !!rating,
      stars: rating?.stars ?? null,
      shortFeedback: rating?.shortFeedback ?? null,
    };
  }
}
