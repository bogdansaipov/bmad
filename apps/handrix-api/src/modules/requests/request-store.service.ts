import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import {
  Prisma,
  PrismaClient,
  PublicRequestStatus as PrismaPublicRequestStatus,
  RequestHistoryActorType as PrismaRequestHistoryActorType,
  RequestHistoryVisibility as PrismaRequestHistoryVisibility,
  RequestInterventionKind as PrismaRequestInterventionKind,
  RequestLifecycleState as PrismaRequestLifecycleState,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import type {
  ClarifyingAnswer,
  ContainmentGuidance,
  IntakeClassification,
  OpsAssignmentOwnerType,
  IssueTypeId,
  PublicRequestStatus,
  RequestLifecycleState as SharedRequestLifecycleState,
  RequestRecoveryState,
  RequestReviewSummary,
  RequestTrackingCredential,
  ServiceLocation,
} from '@handrix/shared-contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestRecoveryState } from './request-status-recovery.presenter';
import { getTrackingStatusContent } from './request-status-content.presenter';
import { getPublicRequestStatusPresentation } from './request-status.presenter';
import {
  hashRequestTrackingToken,
  issueRequestTrackingCredential,
} from './request-tracking-credential';

export type RequestLifecycleState = SharedRequestLifecycleState;

export type RequestHistoryActorType = 'system' | 'customer' | 'ops' | 'support';
export type PersistedRequestHistoryVisibility = 'customer' | 'internal';
export type PersistedRequestInterventionKind =
  | 'clarification'
  | 'blocker'
  | 'unavailable';

export type PersistedRequestIntervention = {
  kind: PersistedRequestInterventionKind;
  detail?: string;
};

export type PersistedRequestCustomerSnapshot = {
  publicStatusLabel: string;
  publicStatusDetail: string;
  nextStepDetail: string;
  recoveryState: RequestRecoveryState | null;
};

export type PersistedRequestCustomerContext = {
  shownContainmentGuidance?: ContainmentGuidance;
  shownRequestReviewSummary?: RequestReviewSummary;
};

export type PersistedRequestAssignment = {
  ownerType: OpsAssignmentOwnerType;
  ownerId: string;
  ownerLabel: string;
  assignedAt: string;
  note?: string;
};

export type PersistedRequestHistoryEntry = {
  previousLifecycleState: RequestLifecycleState | null;
  nextLifecycleState: RequestLifecycleState;
  previousPublicStatus: PublicRequestStatus | null;
  nextPublicStatus: PublicRequestStatus;
  occurredAt: string;
  actorType: RequestHistoryActorType;
  actorId?: string;
  changeSummary: string;
  visibility?: PersistedRequestHistoryVisibility;
  intervention?: PersistedRequestIntervention | null;
  customerSnapshot: PersistedRequestCustomerSnapshot;
};

export type PersistedServiceRequest = {
  internalId: string;
  publicId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  issueTypeId: IssueTypeId;
  issueLabel: string;
  answers: ClarifyingAnswer[];
  serviceLocation: ServiceLocation;
  classification: IntakeClassification;
  lifecycleState: RequestLifecycleState;
  publicStatus: PublicRequestStatus;
  createdAt: string;
  confirmedAt?: string | null;
  fulfilledAt?: string | null;
  cancelledAt?: string | null;
  trackingCredential: RequestTrackingCredential;
  assignment?: PersistedRequestAssignment;
  customerContext?: PersistedRequestCustomerContext;
  history: PersistedRequestHistoryEntry[];
};

type RequestStoreCreateResult =
  | { kind: 'created'; record: PersistedServiceRequest }
  | { kind: 'existing'; record: PersistedServiceRequest };

type RequestHistoryAppendInput = {
  publicId: string;
  lifecycleState: RequestLifecycleState;
  publicStatus: PublicRequestStatus;
  createdAt: string;
  note: string;
  actorType?: RequestHistoryActorType;
  actorId?: string;
  visibility?: PersistedRequestHistoryVisibility;
  intervention?: PersistedRequestIntervention | null;
};

type RequestAssignmentInput = {
  publicId: string;
  assignment: PersistedRequestAssignment;
  lifecycleState: RequestLifecycleState;
  publicStatus: PublicRequestStatus;
  note: string;
  actorId?: string;
};

type RequestLifecycleTransitionInput = {
  publicId: string;
  lifecycleState: RequestLifecycleState;
  publicStatus: PublicRequestStatus;
  occurredAt: string;
  note: string;
  actorType?: RequestHistoryActorType;
  actorId?: string;
  visibility?: PersistedRequestHistoryVisibility;
  intervention?: PersistedRequestIntervention | null;
};

const requestRecordInclude = {
  assignment: true,
  history: {
    orderBy: {
      occurredAt: 'asc',
    },
  },
} satisfies Prisma.ServiceRequestInclude;

type RequestRecord = Prisma.ServiceRequestGetPayload<{
  include: typeof requestRecordInclude;
}>;

function buildCustomerSnapshot(
  publicStatus: PublicRequestStatus,
): PersistedRequestCustomerSnapshot {
  const presentation = getPublicRequestStatusPresentation(publicStatus);
  const trackingStatusContent = getTrackingStatusContent(publicStatus);
  const recoveryState = getRequestRecoveryState(publicStatus);

  return {
    publicStatusLabel: presentation.publicStatusLabel,
    publicStatusDetail: presentation.publicStatusDetail,
    nextStepDetail: trackingStatusContent.nextStepDetail,
    recoveryState:
      recoveryState === null
        ? null
        : {
            ...recoveryState,
            fallbackGuidance:
              trackingStatusContent.fallbackGuidance ??
              recoveryState.fallbackGuidance,
          },
  };
}

function getInterventionForLifecycleState(
  lifecycleState: RequestLifecycleState,
): PersistedRequestIntervention | null {
  switch (lifecycleState) {
    case 'clarification_needed':
      return { kind: 'clarification' };
    case 'dispatch_delayed':
      return { kind: 'blocker' };
    case 'unfulfilled':
      return { kind: 'unavailable' };
    case 'awaiting_confirmation':
    case 'intake_in_review':
    case 'dispatch_in_progress':
    case 'completed':
      return null;
  }
}

function toPrismaLifecycleState(
  lifecycleState: RequestLifecycleState,
): PrismaRequestLifecycleState {
  return lifecycleState as PrismaRequestLifecycleState;
}

function toPrismaPublicStatus(
  publicStatus: PublicRequestStatus,
): PrismaPublicRequestStatus {
  return publicStatus as PrismaPublicRequestStatus;
}

function toPrismaActorType(
  actorType: RequestHistoryActorType,
): PrismaRequestHistoryActorType {
  return actorType as PrismaRequestHistoryActorType;
}

function toPrismaVisibility(
  visibility: PersistedRequestHistoryVisibility,
): PrismaRequestHistoryVisibility {
  return visibility as PrismaRequestHistoryVisibility;
}

function toPrismaInterventionKind(
  kind: PersistedRequestInterventionKind,
): PrismaRequestInterventionKind {
  return kind as PrismaRequestInterventionKind;
}

function parseJsonValue<T>(value: Prisma.JsonValue | null | undefined): T {
  return (value ?? null) as T;
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function serializeHistoryEntry(
  entry: PersistedRequestHistoryEntry,
): Omit<Prisma.RequestStatusHistoryUncheckedCreateInput, 'requestId'> {
  return {
    id: randomUUID(),
    previousLifecycleState:
      entry.previousLifecycleState === null
        ? null
        : toPrismaLifecycleState(entry.previousLifecycleState),
    nextLifecycleState: toPrismaLifecycleState(entry.nextLifecycleState),
    previousPublicStatus:
      entry.previousPublicStatus === null
        ? null
        : toPrismaPublicStatus(entry.previousPublicStatus),
    nextPublicStatus: toPrismaPublicStatus(entry.nextPublicStatus),
    occurredAt: new Date(entry.occurredAt),
    actorType: toPrismaActorType(entry.actorType),
    actorId: entry.actorId ?? null,
    changeSummary: entry.changeSummary,
    visibility: toPrismaVisibility(entry.visibility ?? 'customer'),
    interventionKind: entry.intervention
      ? toPrismaInterventionKind(entry.intervention.kind)
      : null,
    interventionDetail: entry.intervention?.detail ?? null,
    customerSnapshot: toInputJsonValue(entry.customerSnapshot),
  };
}

function deserializeHistoryEntry(
  entry: RequestRecord['history'][number],
): PersistedRequestHistoryEntry {
  return {
    previousLifecycleState:
      entry.previousLifecycleState as RequestLifecycleState | null,
    nextLifecycleState: entry.nextLifecycleState as RequestLifecycleState,
    previousPublicStatus:
      entry.previousPublicStatus as PublicRequestStatus | null,
    nextPublicStatus: entry.nextPublicStatus as PublicRequestStatus,
    occurredAt: entry.occurredAt.toISOString(),
    actorType: entry.actorType as RequestHistoryActorType,
    actorId: entry.actorId ?? undefined,
    changeSummary: entry.changeSummary,
    visibility: entry.visibility as PersistedRequestHistoryVisibility,
    intervention: entry.interventionKind
      ? {
          kind: entry.interventionKind as PersistedRequestInterventionKind,
          ...(entry.interventionDetail
            ? { detail: entry.interventionDetail }
            : {}),
        }
      : null,
    customerSnapshot: parseJsonValue<PersistedRequestCustomerSnapshot>(
      entry.customerSnapshot,
    ),
  };
}

function deserializeRequest(record: RequestRecord): PersistedServiceRequest {
  const history = record.history
    .map(deserializeHistoryEntry)
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

  return {
    internalId: record.id,
    publicId: record.publicId,
    idempotencyKey: record.idempotencyKey,
    requestFingerprint: record.requestFingerprint,
    issueTypeId: record.issueTypeId as IssueTypeId,
    issueLabel: record.issueLabel,
    answers: parseJsonValue<ClarifyingAnswer[]>(record.answers),
    confirmedAt: record.confirmedAt?.toISOString() ?? null,
    fulfilledAt: record.fulfilledAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    serviceLocation: {
      addressLine1: record.addressLine1,
      city: record.city,
      postalCode: record.postalCode,
      unitOrAccessNote: record.unitOrAccessNote ?? '',
      locationDetails: record.locationDetails ?? '',
    },
    classification: {
      issueTypeId: record.issueTypeId as IssueTypeId,
      serviceabilityStatus:
        record.serviceabilityStatus as IntakeClassification['serviceabilityStatus'],
      nextStep: record.intakeNextStep as IntakeClassification['nextStep'],
      summaryHeadline: record.intakeSummaryHeadline,
      summaryDetail: record.intakeSummaryDetail,
      ...(record.intakeRecoveryCode
        ? {
            recoveryCode: record.intakeRecoveryCode as NonNullable<
              IntakeClassification['recoveryCode']
            >,
          }
        : {}),
    },
    lifecycleState: record.lifecycleState as RequestLifecycleState,
    publicStatus: record.publicStatus as PublicRequestStatus,
    createdAt: record.createdAt.toISOString(),
    trackingCredential: issueRequestTrackingCredential(
      record.publicId,
      record.createdAt.toISOString(),
      record.trackingTokenExpiresAt.toISOString(),
    ),
    assignment: record.assignment
      ? {
          ownerType: record.assignment.ownerType as OpsAssignmentOwnerType,
          ownerId: record.assignment.ownerId,
          ownerLabel: record.assignment.ownerLabel,
          assignedAt: record.assignment.assignedAt.toISOString(),
          ...(record.assignment.note ? { note: record.assignment.note } : {}),
        }
      : undefined,
    customerContext:
      record.customerContext === null
        ? undefined
        : parseJsonValue<PersistedRequestCustomerContext>(
            record.customerContext,
          ),
    history,
  };
}

export function createPersistedHistoryEntry(input: {
  previousLifecycleState: RequestLifecycleState | null;
  nextLifecycleState: RequestLifecycleState;
  previousPublicStatus: PublicRequestStatus | null;
  nextPublicStatus: PublicRequestStatus;
  occurredAt: string;
  changeSummary: string;
  actorType?: RequestHistoryActorType;
  actorId?: string;
  visibility?: PersistedRequestHistoryVisibility;
  intervention?: PersistedRequestIntervention | null;
}): PersistedRequestHistoryEntry {
  return {
    previousLifecycleState: input.previousLifecycleState,
    nextLifecycleState: input.nextLifecycleState,
    previousPublicStatus: input.previousPublicStatus,
    nextPublicStatus: input.nextPublicStatus,
    occurredAt: input.occurredAt,
    actorType: input.actorType ?? 'system',
    actorId: input.actorId,
    changeSummary: input.changeSummary,
    visibility: input.visibility ?? 'customer',
    intervention:
      input.intervention ??
      getInterventionForLifecycleState(input.nextLifecycleState),
    customerSnapshot: buildCustomerSnapshot(input.nextPublicStatus),
  };
}

@Injectable()
export class RequestStoreService {
  constructor(private readonly prisma: PrismaService) {}

  // Exposed for test harnesses that wire Prisma into adjacent services
  // without running the full Nest DI module.
  getPrismaClient(): PrismaService {
    return this.prisma;
  }

  static forFilePath(filePath: string) {
    const baseDatabaseUrl = process.env.HANDRIX_DATABASE_URL?.trim();

    if (!baseDatabaseUrl) {
      throw new Error(
        'HANDRIX_DATABASE_URL must be set before using the test request store.',
      );
    }

    const databaseUrl = new URL(baseDatabaseUrl);
    databaseUrl.searchParams.set(
      'schema',
      `test_${createHash('sha256').update(filePath).digest('hex').slice(0, 12)}`,
    );

    execFileSync(
      'pnpm',
      [
        'exec',
        'prisma',
        'migrate',
        'deploy',
        '--schema',
        'prisma/schema.prisma',
      ],
      {
        cwd: resolve(__dirname, '../../..'),
        env: {
          ...process.env,
          HANDRIX_DATABASE_URL: databaseUrl.toString(),
        },
        stdio: 'pipe',
      },
    );

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl.toString(),
        },
      },
    });

    return new RequestStoreService(prisma as unknown as PrismaService);
  }

  async createOrGetByIdempotencyKey(
    record: PersistedServiceRequest,
  ): Promise<RequestStoreCreateResult> {
    const existing = await this.prisma.serviceRequest.findUnique({
      where: {
        idempotencyKey: record.idempotencyKey,
      },
      include: requestRecordInclude,
    });

    if (existing) {
      const persistedExisting = deserializeRequest(existing);

      if (persistedExisting.requestFingerprint !== record.requestFingerprint) {
        throw new Error(
          'This confirmation attempt conflicts with an existing request submission.',
        );
      }

      return {
        kind: 'existing',
        record: persistedExisting,
      };
    }

    try {
      const created = await this.prisma.serviceRequest.create({
        data: {
          id: record.internalId,
          publicId: record.publicId,
          idempotencyKey: record.idempotencyKey,
          requestFingerprint: record.requestFingerprint,
          issueTypeId: record.issueTypeId,
          issueLabel: record.issueLabel,
          answers: toInputJsonValue(record.answers),
          serviceabilityStatus: record.classification.serviceabilityStatus,
          intakeNextStep: record.classification.nextStep,
          intakeSummaryHeadline: record.classification.summaryHeadline,
          intakeSummaryDetail: record.classification.summaryDetail,
          intakeRecoveryCode: record.classification.recoveryCode ?? null,
          addressLine1: record.serviceLocation.addressLine1,
          city: record.serviceLocation.city,
          postalCode: record.serviceLocation.postalCode,
          unitOrAccessNote: record.serviceLocation.unitOrAccessNote ?? null,
          locationDetails: record.serviceLocation.locationDetails ?? null,
          lifecycleState: toPrismaLifecycleState(record.lifecycleState),
          publicStatus: toPrismaPublicStatus(record.publicStatus),
          createdAt: new Date(record.createdAt),
          confirmedAt: new Date(record.createdAt),
          trackingTokenDigest: hashRequestTrackingToken(
            record.trackingCredential.token,
          ),
          trackingTokenExpiresAt: new Date(record.trackingCredential.expiresAt),
          customerContext: record.customerContext
            ? toInputJsonValue(record.customerContext)
            : Prisma.JsonNull,
          assignment: record.assignment
            ? {
                create: {
                  ownerType: record.assignment.ownerType,
                  ownerId: record.assignment.ownerId,
                  ownerLabel: record.assignment.ownerLabel,
                  assignedAt: new Date(record.assignment.assignedAt),
                  note: record.assignment.note ?? null,
                },
              }
            : undefined,
          history: {
            create: record.history.map((entry) => serializeHistoryEntry(entry)),
          },
        },
        include: requestRecordInclude,
      });

      return {
        kind: 'created',
        record: deserializeRequest(created),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const conflicted = await this.prisma.serviceRequest.findUnique({
          where: {
            idempotencyKey: record.idempotencyKey,
          },
          include: requestRecordInclude,
        });

        if (conflicted) {
          const persistedConflicted = deserializeRequest(conflicted);

          if (
            persistedConflicted.requestFingerprint !== record.requestFingerprint
          ) {
            throw new Error(
              'This confirmation attempt conflicts with an existing request submission.',
            );
          }

          return {
            kind: 'existing',
            record: persistedConflicted,
          };
        }
      }

      throw error;
    }
  }

  async listRequests() {
    const requests = await this.prisma.serviceRequest.findMany({
      include: requestRecordInclude,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return requests.map(deserializeRequest);
  }

  async getByPublicId(publicId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: {
        publicId,
      },
      include: requestRecordInclude,
    });

    return request ? deserializeRequest(request) : null;
  }

  async appendHistoryEntry(input: RequestHistoryAppendInput) {
    return this.transitionRequestLifecycle({
      publicId: input.publicId,
      lifecycleState: input.lifecycleState,
      publicStatus: input.publicStatus,
      occurredAt: input.createdAt,
      note: input.note,
      actorType: input.actorType,
      actorId: input.actorId,
      visibility: input.visibility,
      intervention: input.intervention,
    });
  }

  async assignFulfillmentOwner(input: RequestAssignmentInput) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.findUnique({
        where: {
          publicId: input.publicId,
        },
      });

      if (!request) {
        return null;
      }

      await tx.requestAssignment.upsert({
        where: {
          requestId: request.id,
        },
        update: {
          ownerType: input.assignment.ownerType,
          ownerId: input.assignment.ownerId,
          ownerLabel: input.assignment.ownerLabel,
          assignedAt: new Date(input.assignment.assignedAt),
          note: input.assignment.note ?? null,
        },
        create: {
          requestId: request.id,
          ownerType: input.assignment.ownerType,
          ownerId: input.assignment.ownerId,
          ownerLabel: input.assignment.ownerLabel,
          assignedAt: new Date(input.assignment.assignedAt),
          note: input.assignment.note ?? null,
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId: request.id,
          ...serializeHistoryEntry(
            createPersistedHistoryEntry({
              previousLifecycleState:
                request.lifecycleState as RequestLifecycleState,
              nextLifecycleState: input.lifecycleState,
              previousPublicStatus: request.publicStatus as PublicRequestStatus,
              nextPublicStatus: input.publicStatus,
              occurredAt: input.assignment.assignedAt,
              changeSummary: input.note,
              actorType: 'ops',
              actorId: input.actorId,
            }),
          ),
        },
      });

      const updated = await tx.serviceRequest.update({
        where: {
          id: request.id,
        },
        data: {
          lifecycleState: toPrismaLifecycleState(input.lifecycleState),
          publicStatus: toPrismaPublicStatus(input.publicStatus),
        },
        include: requestRecordInclude,
      });

      return deserializeRequest(updated);
    });
  }

  async transitionRequestLifecycle(input: RequestLifecycleTransitionInput) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.findUnique({
        where: {
          publicId: input.publicId,
        },
      });

      if (!request) {
        return null;
      }

      await tx.requestStatusHistory.create({
        data: {
          requestId: request.id,
          ...serializeHistoryEntry(
            createPersistedHistoryEntry({
              previousLifecycleState:
                request.lifecycleState as RequestLifecycleState,
              nextLifecycleState: input.lifecycleState,
              previousPublicStatus: request.publicStatus as PublicRequestStatus,
              nextPublicStatus: input.publicStatus,
              occurredAt: input.occurredAt,
              changeSummary: input.note,
              actorType: input.actorType,
              actorId: input.actorId,
              visibility: input.visibility,
              intervention: input.intervention,
            }),
          ),
        },
      });

      const lifecycleTimestampPatch = buildLifecycleTimestampPatch({
        nextLifecycleState: input.lifecycleState,
        existingFulfilledAt: request.fulfilledAt,
        existingCancelledAt: request.cancelledAt,
        occurredAt: input.occurredAt,
      });

      const updated = await tx.serviceRequest.update({
        where: {
          id: request.id,
        },
        data: {
          lifecycleState: toPrismaLifecycleState(input.lifecycleState),
          publicStatus: toPrismaPublicStatus(input.publicStatus),
          ...lifecycleTimestampPatch,
        },
        include: requestRecordInclude,
      });

      return deserializeRequest(updated);
    });
  }
}

function buildLifecycleTimestampPatch(input: {
  nextLifecycleState: RequestLifecycleState;
  existingFulfilledAt: Date | null;
  existingCancelledAt: Date | null;
  occurredAt: string;
}) {
  const patch: {
    fulfilledAt?: Date;
    cancelledAt?: Date;
  } = {};

  if (
    input.nextLifecycleState === 'completed' &&
    input.existingFulfilledAt === null
  ) {
    patch.fulfilledAt = new Date(input.occurredAt);
  }

  if (
    input.nextLifecycleState === 'unfulfilled' &&
    input.existingCancelledAt === null
  ) {
    patch.cancelledAt = new Date(input.occurredAt);
  }

  return patch;
}
