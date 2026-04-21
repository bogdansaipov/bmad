import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
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
import { getRequestRecoveryState } from './request-status-recovery.presenter';
import { getTrackingStatusContent } from './request-status-content.presenter';
import { getPublicRequestStatusPresentation } from './request-status.presenter';

export type RequestLifecycleState = SharedRequestLifecycleState;

export type RequestHistoryActorType = 'system' | 'customer' | 'ops' | 'support';
export type PersistedRequestInterventionKind =
  | 'clarification'
  | 'blocker'
  | 'unavailable';

export type PersistedRequestIntervention = {
  kind: PersistedRequestInterventionKind;
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
  intervention?: PersistedRequestIntervention | null;
  customerSnapshot: PersistedRequestCustomerSnapshot;
};

type LegacyPersistedRequestHistoryEntry = {
  lifecycleState: RequestLifecycleState;
  publicStatus: PublicRequestStatus;
  createdAt: string;
  note: string;
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
  trackingCredential: RequestTrackingCredential;
  assignment?: PersistedRequestAssignment;
  customerContext?: PersistedRequestCustomerContext;
  history: PersistedRequestHistoryEntry[];
};

type RequestStoreData = {
  requests: PersistedServiceRequest[];
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
};

function isLegacyHistoryEntry(
  entry: PersistedRequestHistoryEntry | LegacyPersistedRequestHistoryEntry,
): entry is LegacyPersistedRequestHistoryEntry {
  return 'lifecycleState' in entry;
}

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

export function createPersistedHistoryEntry(input: {
  previousLifecycleState: RequestLifecycleState | null;
  nextLifecycleState: RequestLifecycleState;
  previousPublicStatus: PublicRequestStatus | null;
  nextPublicStatus: PublicRequestStatus;
  occurredAt: string;
  changeSummary: string;
  actorType?: RequestHistoryActorType;
  actorId?: string;
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
    intervention:
      input.intervention ??
      getInterventionForLifecycleState(input.nextLifecycleState),
    customerSnapshot: buildCustomerSnapshot(input.nextPublicStatus),
  };
}

function normalizeHistoryEntries(
  history: Array<
    PersistedRequestHistoryEntry | LegacyPersistedRequestHistoryEntry
  >,
) {
  const normalizedEntries: PersistedRequestHistoryEntry[] = [];

  for (const entry of history) {
    if (isLegacyHistoryEntry(entry)) {
      const previousEntry = normalizedEntries[normalizedEntries.length - 1];

      normalizedEntries.push(
        createPersistedHistoryEntry({
          previousLifecycleState: previousEntry?.nextLifecycleState ?? null,
          nextLifecycleState: entry.lifecycleState,
          previousPublicStatus: previousEntry?.nextPublicStatus ?? null,
          nextPublicStatus: entry.publicStatus,
          occurredAt: entry.createdAt,
          changeSummary: entry.note,
        }),
      );
      continue;
    }

    normalizedEntries.push({
      ...entry,
      intervention:
        entry.intervention ??
        getInterventionForLifecycleState(entry.nextLifecycleState),
      customerSnapshot:
        entry.customerSnapshot ?? buildCustomerSnapshot(entry.nextPublicStatus),
    });
  }

  return normalizedEntries;
}

function getDefaultStorePath() {
  if (process.env.HANDRIX_REQUEST_STORE_PATH?.trim()) {
    return resolve(process.env.HANDRIX_REQUEST_STORE_PATH);
  }

  if (process.env.HANDRIX_ENV === 'test' || process.env.NODE_ENV === 'test') {
    return resolve(
      tmpdir(),
      `handrix-service-requests-${process.pid}-${randomUUID()}.json`,
    );
  }

  return resolve(process.cwd(), 'apps/handrix-api/.data/service-requests.json');
}

@Injectable()
export class RequestStoreService {
  private filePath: string;
  private writeQueue = Promise.resolve();

  constructor() {
    this.filePath = getDefaultStorePath();
  }

  static forFilePath(filePath: string) {
    const store = new RequestStoreService();
    store.filePath = filePath;
    return store;
  }

  async createOrGetByIdempotencyKey(
    record: PersistedServiceRequest,
  ): Promise<RequestStoreCreateResult> {
    return this.withLock(async () => {
      const store = await this.readStore();
      const existing = store.requests.find(
        (request) => request.idempotencyKey === record.idempotencyKey,
      );

      if (existing) {
        if (existing.requestFingerprint !== record.requestFingerprint) {
          throw new Error(
            'This confirmation attempt conflicts with an existing request submission.',
          );
        }

        return {
          kind: 'existing',
          record: existing,
        };
      }

      store.requests.push(record);
      await this.writeStore(store);

      return {
        kind: 'created',
        record,
      };
    });
  }

  async listRequests() {
    const store = await this.readStore();
    return store.requests;
  }

  async getByPublicId(publicId: string) {
    const store = await this.readStore();
    return (
      store.requests.find((request) => request.publicId === publicId) ?? null
    );
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
    });
  }

  async assignFulfillmentOwner(input: RequestAssignmentInput) {
    return this.withLock(async () => {
      const store = await this.readStore();
      const requestIndex = store.requests.findIndex(
        (request) => request.publicId === input.publicId,
      );

      if (requestIndex === -1) {
        return null;
      }

      const request = store.requests[requestIndex];
      const nextHistoryEntry = createPersistedHistoryEntry({
        previousLifecycleState: request.lifecycleState,
        nextLifecycleState: input.lifecycleState,
        previousPublicStatus: request.publicStatus,
        nextPublicStatus: input.publicStatus,
        occurredAt: input.assignment.assignedAt,
        changeSummary: input.note,
        actorType: 'ops',
        actorId: input.actorId,
      });

      const updatedRequest: PersistedServiceRequest = {
        ...request,
        assignment: input.assignment,
        lifecycleState: input.lifecycleState,
        publicStatus: input.publicStatus,
        history: [...request.history, nextHistoryEntry],
      };

      store.requests[requestIndex] = updatedRequest;
      await this.writeStore(store);

      return updatedRequest;
    });
  }

  async transitionRequestLifecycle(input: RequestLifecycleTransitionInput) {
    return this.withLock(async () => {
      const store = await this.readStore();
      const requestIndex = store.requests.findIndex(
        (request) => request.publicId === input.publicId,
      );

      if (requestIndex === -1) {
        return null;
      }

      const request = store.requests[requestIndex];
      const nextHistoryEntry = createPersistedHistoryEntry({
        previousLifecycleState: request.lifecycleState,
        nextLifecycleState: input.lifecycleState,
        previousPublicStatus: request.publicStatus,
        nextPublicStatus: input.publicStatus,
        occurredAt: input.occurredAt,
        changeSummary: input.note,
        actorType: input.actorType,
        actorId: input.actorId,
      });

      const updatedRequest: PersistedServiceRequest = {
        ...request,
        lifecycleState: input.lifecycleState,
        publicStatus: input.publicStatus,
        history: [...request.history, nextHistoryEntry],
      };

      store.requests[requestIndex] = updatedRequest;
      await this.writeStore(store);

      return updatedRequest;
    });
  }

  private async withLock<T>(operation: () => Promise<T>) {
    const nextOperation = this.writeQueue.then(operation, operation);
    this.writeQueue = nextOperation.then(
      () => undefined,
      () => undefined,
    );
    return nextOperation;
  }

  private async readStore(): Promise<RequestStoreData> {
    try {
      const fileContents = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(fileContents) as {
        requests?: Array<
          Omit<PersistedServiceRequest, 'history'> & {
            history?: Array<
              PersistedRequestHistoryEntry | LegacyPersistedRequestHistoryEntry
            >;
          }
        >;
      };

      return {
        requests: Array.isArray(parsed.requests)
          ? parsed.requests.map((request) => ({
              ...request,
              assignment: request.assignment,
              history: normalizeHistoryEntries(request.history ?? []),
            }))
          : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.writeStore({
          requests: [],
        });

        return {
          requests: [],
        };
      }

      throw error;
    }
  }

  private async writeStore(store: RequestStoreData) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      `${JSON.stringify(store, null, 2)}\n`,
      'utf8',
    );
  }
}
