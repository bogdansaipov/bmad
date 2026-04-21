import type {
  InternalSupportSession,
  SupportRequestDetailCurrentState,
  SupportRequestDetailResponse,
  SupportRequestSearchResponse,
  SupportRequestSearchResult,
  SupportSearchRequestQuery,
} from '@handrix/shared-contracts';
import { Injectable } from '@nestjs/common';
import type { AuthenticatedInternalUser } from '../auth/internal-auth.types';
import type {
  PersistedServiceRequest,
  RequestLifecycleState,
} from '../requests/request-store.service';
import { RequestStoreService } from '../requests/request-store.service';

type SearchRequestsInput = {
  q?: string;
  limit?: number;
};

const DEFAULT_SEARCH_LIMIT = 25;
const MAX_SEARCH_LIMIT = 50;
const MIN_NORMALIZED_QUERY_LENGTH = 2;

function getLifecycleLabelPresentation(lifecycleState: RequestLifecycleState): {
  label: string;
  detail: string;
} {
  switch (lifecycleState) {
    case 'awaiting_confirmation':
      return {
        label: 'Awaiting confirmation',
        detail: 'The request has not been confirmed yet.',
      };
    case 'intake_in_review':
      return {
        label: 'Intake in review',
        detail:
          'Operations is still reviewing the intake details before assignment.',
      };
    case 'dispatch_in_progress':
      return {
        label: 'Dispatch in progress',
        detail: 'The request is moving through dispatch after review.',
      };
    case 'dispatch_delayed':
      return {
        label: 'Dispatch delayed',
        detail:
          'A blocker is slowing fulfillment and may require intervention.',
      };
    case 'clarification_needed':
      return {
        label: 'Clarification needed',
        detail:
          'The request needs additional detail before fulfillment can continue.',
      };
    case 'completed':
      return {
        label: 'Completed',
        detail: 'The request lifecycle is complete.',
      };
    case 'unfulfilled':
      return {
        label: 'Unavailable',
        detail: 'The request cannot currently move forward to fulfillment.',
      };
  }
}

function getInterventionLabelForLifecycleState(
  lifecycleState: RequestLifecycleState,
): string | null {
  switch (lifecycleState) {
    case 'clarification_needed':
      return 'Clarification needed';
    case 'dispatch_delayed':
      return 'Operational blocker';
    case 'unfulfilled':
      return 'Unavailable outcome';
    case 'awaiting_confirmation':
    case 'intake_in_review':
    case 'dispatch_in_progress':
    case 'completed':
      return null;
  }
}

function formatAddressSummary(request: PersistedServiceRequest): string {
  const unitOrAccessNote = (
    request.serviceLocation.unitOrAccessNote ?? ''
  ).trim();
  const locationPieces = [
    request.serviceLocation.addressLine1.trim(),
    request.serviceLocation.city.trim(),
  ].filter(Boolean);

  if (!unitOrAccessNote) {
    return locationPieces.join(', ');
  }

  return `${locationPieces.join(', ')} • ${unitOrAccessNote}`;
}

function getLatestHistoryEntry(request: PersistedServiceRequest) {
  return request.history[request.history.length - 1];
}

function recordMatchesQuery(
  request: PersistedServiceRequest,
  normalizedQ: string,
): boolean {
  const unitOrAccessNote =
    request.serviceLocation.unitOrAccessNote?.toLowerCase() ?? '';

  return (
    request.publicId.toLowerCase().includes(normalizedQ) ||
    request.issueLabel.toLowerCase().includes(normalizedQ) ||
    request.serviceLocation.addressLine1.toLowerCase().includes(normalizedQ) ||
    request.serviceLocation.city.toLowerCase().includes(normalizedQ) ||
    request.serviceLocation.postalCode.toLowerCase().includes(normalizedQ) ||
    unitOrAccessNote.includes(normalizedQ)
  );
}

function toSearchResult(
  request: PersistedServiceRequest,
): SupportRequestSearchResult {
  const latestHistoryEntry = getLatestHistoryEntry(request);
  const lifecyclePresentation = getLifecycleLabelPresentation(
    request.lifecycleState,
  );

  return {
    publicId: request.publicId,
    issueLabel: request.issueLabel,
    addressSummary: formatAddressSummary(request),
    currentPublicStatusLabel:
      latestHistoryEntry.customerSnapshot.publicStatusLabel,
    currentPublicStatusDetail:
      latestHistoryEntry.customerSnapshot.publicStatusDetail,
    currentInternalLifecycleLabel: lifecyclePresentation.label,
    currentInternalLifecycleDetail: lifecyclePresentation.detail,
    receivedAt: request.createdAt,
    lastUpdatedAt: latestHistoryEntry.occurredAt,
    latestChangeSummary: latestHistoryEntry.changeSummary,
    currentAssignmentOwnerLabel: request.assignment?.ownerLabel ?? null,
    interventionLabel: getInterventionLabelForLifecycleState(
      request.lifecycleState,
    ),
  };
}

function compareByRecency(
  left: PersistedServiceRequest,
  right: PersistedServiceRequest,
) {
  const leftLatest = getLatestHistoryEntry(left).occurredAt;
  const rightLatest = getLatestHistoryEntry(right).occurredAt;

  if (leftLatest !== rightLatest) {
    return rightLatest.localeCompare(leftLatest);
  }

  return right.createdAt.localeCompare(left.createdAt);
}

@Injectable()
export class SupportService {
  constructor(private readonly requestStoreService: RequestStoreService) {}

  buildSessionPayload(user: AuthenticatedInternalUser): InternalSupportSession {
    return {
      scope: 'support',
      message: 'Support access granted.',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async searchRequests(
    input: SearchRequestsInput,
  ): Promise<SupportRequestSearchResponse> {
    const rawQuery = typeof input.q === 'string' ? input.q : null;
    const normalizedQ = (rawQuery ?? '').trim().toLowerCase();
    const limit = input.limit ?? DEFAULT_SEARCH_LIMIT;
    const cappedLimit = Math.max(1, Math.min(limit, MAX_SEARCH_LIMIT));
    const refreshedAt = new Date().toISOString();

    if (normalizedQ.length < MIN_NORMALIZED_QUERY_LENGTH) {
      return {
        items: [],
        summary: { totalMatched: 0, limitReached: false },
        refreshedAt,
        query: {
          q: rawQuery,
          normalizedQ,
          limit: cappedLimit,
        },
      };
    }

    const requests = await this.requestStoreService.listRequests();
    const matched = requests.filter((request) =>
      recordMatchesQuery(request, normalizedQ),
    );

    const sorted = [...matched].sort(compareByRecency);
    const items = sorted.slice(0, cappedLimit).map(toSearchResult);

    return {
      items,
      summary: {
        totalMatched: matched.length,
        limitReached: matched.length > items.length,
      },
      refreshedAt,
      query: {
        q: rawQuery,
        normalizedQ,
        limit: cappedLimit,
      },
    };
  }

  async getRequestDetail(
    publicId: string,
  ): Promise<SupportRequestDetailResponse | null> {
    const request = await this.requestStoreService.getByPublicId(publicId);

    if (request === null) {
      return null;
    }

    return this.toRequestDetail(request);
  }

  private toRequestDetail(
    request: PersistedServiceRequest,
  ): SupportRequestDetailResponse {
    const latestHistoryEntry = getLatestHistoryEntry(request);
    const lifecyclePresentation = getLifecycleLabelPresentation(
      request.lifecycleState,
    );

    const currentState: SupportRequestDetailCurrentState = {
      lifecycleState: request.lifecycleState,
      lifecycleStateLabel: lifecyclePresentation.label,
      lifecycleStateDetail: lifecyclePresentation.detail,
      publicStatus: request.publicStatus,
      publicStatusLabel: latestHistoryEntry.customerSnapshot.publicStatusLabel,
      publicStatusDetail:
        latestHistoryEntry.customerSnapshot.publicStatusDetail,
    };

    return {
      publicId: request.publicId,
      issueTypeId: request.issueTypeId,
      issueLabel: request.issueLabel,
      createdAt: request.createdAt,
      serviceLocation: request.serviceLocation,
      currentState,
      latestChangeSummary: latestHistoryEntry.changeSummary,
      currentAssignmentOwnerLabel: request.assignment?.ownerLabel ?? null,
      interventionLabel: getInterventionLabelForLifecycleState(
        request.lifecycleState,
      ),
      lastUpdatedAt: latestHistoryEntry.occurredAt,
    };
  }
}

export type { SearchRequestsInput, SupportSearchRequestQuery };
