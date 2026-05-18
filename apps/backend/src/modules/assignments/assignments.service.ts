import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { JOB_OFFER_STATUS } from '@handrix/contracts';
import type { AcceptJobResponse, DeclineJobResponse } from '@handrix/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async acceptJob(userId: string, offerId: string): Promise<AcceptJobResponse> {
    const offer = await this.prisma.jobOfferVisibility.findFirst({
      where: {
        id: offerId,
        handymanProfile: { userId },
        offerStatus: JOB_OFFER_STATUS.PENDING,
      },
      select: { id: true, requestId: true },
    });

    if (!offer) {
      throw new NotFoundException('Job offer not found or already responded to');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceRequest.updateMany({
        where: { id: offer.requestId, status: RequestStatus.PENDING },
        data: { status: RequestStatus.ASSIGNED, assignedHandymanId: userId },
      });

      if (updated.count === 0) {
        this.logger.warn({ event: 'job.accept.conflict', offerId, handymanId: userId });
        throw new ConflictException('Request already assigned to another handyman');
      }

      await tx.jobOfferVisibility.update({
        where: { id: offerId },
        data: { offerStatus: JOB_OFFER_STATUS.ACCEPTED, respondedAt: new Date() },
      });

      await tx.jobOfferVisibility.updateMany({
        where: {
          requestId: offer.requestId,
          offerStatus: JOB_OFFER_STATUS.PENDING,
        },
        data: { offerStatus: JOB_OFFER_STATUS.HIDDEN, respondedAt: new Date() },
      });

      await tx.requestAssignment.create({
        data: {
          requestId: offer.requestId,
          handymanUserId: userId,
          acceptedAt: new Date(),
          assignmentStatus: 'active',
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId: offer.requestId,
          status: RequestStatus.ASSIGNED,
          actorType: 'handyman',
          actorId: userId,
        },
      });
    });

    this.logger.log({ event: 'job.accepted', offerId, handymanId: userId, requestId: offer.requestId });
    return { requestId: offer.requestId, status: 'ASSIGNED' };
  }

  async declineJob(userId: string, offerId: string): Promise<DeclineJobResponse> {
    const offer = await this.prisma.jobOfferVisibility.findFirst({
      where: {
        id: offerId,
        handymanProfile: { userId },
        offerStatus: JOB_OFFER_STATUS.PENDING,
      },
      select: { id: true, requestId: true },
    });

    if (!offer) {
      throw new NotFoundException('Job offer not found or already responded to');
    }

    await this.prisma.$transaction(async (tx) => {
      const declineResult = await tx.jobOfferVisibility.updateMany({
        where: { id: offerId, offerStatus: JOB_OFFER_STATUS.PENDING },
        data: { offerStatus: JOB_OFFER_STATUS.DECLINED, respondedAt: new Date() },
      });

      if (declineResult.count === 0) {
        throw new ConflictException('Job offer already responded to');
      }

      const remainingPending = await tx.jobOfferVisibility.count({
        where: {
          requestId: offer.requestId,
          offerStatus: JOB_OFFER_STATUS.PENDING,
        },
      });

      if (remainingPending === 0) {
        const rejected = await tx.serviceRequest.updateMany({
          where: { id: offer.requestId, status: RequestStatus.PENDING },
          data: { status: RequestStatus.REJECTED },
        });
        if (rejected.count > 0) {
          await tx.requestStatusHistory.create({
            data: {
              requestId: offer.requestId,
              status: RequestStatus.REJECTED,
              actorType: 'system',
              actorId: null,
            },
          });
        }
      }
    });

    this.logger.log({ event: 'job.declined', offerId, handymanId: userId });
    return { offerId, offerStatus: 'declined' };
  }
}
