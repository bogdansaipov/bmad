import { randomUUID } from 'node:crypto';
import {
  type PublicRequestStatus,
  type RequestLifecycleState,
} from '@handrix/shared-contracts';
import { Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLogger } from './app-logger';
import {
  getCurrentCorrelationId,
  getRequestContext,
  updateRequestContext,
  type RequestActorType,
  type RouteScope,
} from './request-context';

export type ObservabilityOutcome =
  | 'success'
  | 'rejected'
  | 'error'
  | 'existing';

export type ObservabilityEventInput = {
  eventName: string;
  routeScope?: RouteScope;
  actorType?: RequestActorType;
  actorId?: string;
  publicId?: string;
  lifecycleState?: RequestLifecycleState;
  publicStatus?: PublicRequestStatus;
  outcome: ObservabilityOutcome;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
};

type HealthSignal = {
  status: 'ok' | 'error';
  detail: string;
};

@Injectable()
export class ObservabilityService {
  constructor(
    @Optional() private readonly prismaService?: PrismaService,
    private readonly appLogger: AppLogger = new AppLogger(),
  ) {}

  annotateRequest(input: {
    actorId?: string;
    actorType?: RequestActorType;
    publicId?: string;
  }) {
    updateRequestContext(input);
  }

  async recordEvent(input: ObservabilityEventInput) {
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const correlationId = input.correlationId ?? getCurrentCorrelationId();
    const requestContext = getRequestContext();
    const routeScope =
      input.routeScope ?? requestContext?.routeScope ?? 'system';
    const actorType = input.actorType ?? requestContext?.actorType ?? 'system';
    const actorId = input.actorId ?? requestContext?.actorId;
    const publicId = input.publicId ?? requestContext?.publicId;
    const metadata = input.metadata ?? {};

    if (publicId) {
      updateRequestContext({ publicId });
    }

    this.appLogger.info('observability.event', {
      eventName: input.eventName,
      correlationId,
      routeScope,
      actorType,
      actorId,
      publicId,
      lifecycleState: input.lifecycleState,
      publicStatus: input.publicStatus,
      outcome: input.outcome,
      occurredAt,
      metadata,
    });

    if (!this.prismaService) {
      return;
    }

    try {
      await this.prismaService.observabilityEvent.create({
        data: {
          id: randomUUID(),
          eventName: input.eventName,
          correlationId,
          routeScope,
          actorType,
          actorId: actorId ?? null,
          publicId: publicId ?? null,
          requestLifecycleState: input.lifecycleState ?? null,
          publicStatus: input.publicStatus ?? null,
          outcome: input.outcome,
          occurredAt: new Date(occurredAt),
          metadata: this.toInputJsonValue(metadata),
        },
      });
    } catch (error) {
      this.appLogger.warning('observability.persistence_failed', {
        correlationId,
        eventName: input.eventName,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to persist observability event.',
      });
    }
  }

  async checkDatabaseReadiness(): Promise<HealthSignal> {
    if (!this.prismaService) {
      return {
        status: 'error',
        detail:
          'Database readiness is unavailable because Prisma is not configured.',
      };
    }

    try {
      await this.prismaService.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        detail: 'Database connection is ready.',
      };
    } catch (error) {
      this.appLogger.failure('health.database_readiness_failed', {
        correlationId: getCurrentCorrelationId(),
        message:
          error instanceof Error ? error.message : 'Database readiness failed.',
      });

      return {
        status: 'error',
        detail: 'Database connection failed.',
      };
    }
  }

  private toInputJsonValue(value: Record<string, unknown>) {
    return value as Prisma.InputJsonValue;
  }
}
