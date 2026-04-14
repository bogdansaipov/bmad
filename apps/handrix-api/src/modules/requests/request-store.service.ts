import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import type {
  ClarifyingAnswer,
  IntakeClassification,
  IssueTypeId,
  PublicRequestStatus,
  RequestTrackingCredential,
  ServiceLocation,
} from '@handrix/shared-contracts';

export type RequestLifecycleState =
  | 'awaiting_confirmation'
  | 'intake_in_review'
  | 'dispatch_in_progress'
  | 'clarification_needed'
  | 'completed'
  | 'unfulfilled';

export type PersistedRequestHistoryEntry = {
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
  history: PersistedRequestHistoryEntry[];
};

type RequestStoreData = {
  requests: PersistedServiceRequest[];
};

type RequestStoreCreateResult =
  | { kind: 'created'; record: PersistedServiceRequest }
  | { kind: 'existing'; record: PersistedServiceRequest };

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
      const parsed = JSON.parse(fileContents) as RequestStoreData;

      return {
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
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
