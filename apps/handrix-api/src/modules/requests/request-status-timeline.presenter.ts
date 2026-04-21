import type {
  RequestStatusHistoryEntry,
  RequestStatusTimelineEntry,
  RequestStatusResponse,
} from '@handrix/shared-contracts';
import type {
  PersistedRequestHistoryEntry,
  PersistedServiceRequest,
} from './request-store.service';

function toHistoryEntry(
  entry: PersistedRequestHistoryEntry,
): RequestStatusHistoryEntry {
  return {
    previousPublicStatus: entry.previousPublicStatus,
    publicStatus: entry.nextPublicStatus,
    publicStatusLabel: entry.customerSnapshot.publicStatusLabel,
    publicStatusDetail: entry.customerSnapshot.publicStatusDetail,
    happenedAt: entry.occurredAt,
    changeSummary: entry.changeSummary,
    nextStepDetail: entry.customerSnapshot.nextStepDetail,
    recoveryState: entry.customerSnapshot.recoveryState,
  };
}

function collapseMeaningfulHistoryEntries(
  history: RequestStatusHistoryEntry[],
) {
  const meaningfulEntries: RequestStatusHistoryEntry[] = [];

  for (const entry of history) {
    const previousEntry = meaningfulEntries[meaningfulEntries.length - 1];

    if (previousEntry?.publicStatus === entry.publicStatus) {
      meaningfulEntries[meaningfulEntries.length - 1] = entry;
      continue;
    }

    meaningfulEntries.push(entry);
  }

  return meaningfulEntries;
}

function toTimelineEntry(
  entry: RequestStatusHistoryEntry,
  isCurrent: boolean,
): RequestStatusTimelineEntry {
  return {
    publicStatus: entry.publicStatus,
    publicStatusLabel: entry.publicStatusLabel,
    publicStatusDetail: entry.publicStatusDetail,
    happenedAt: entry.happenedAt,
    isCurrent,
    changeSummary: entry.changeSummary,
  };
}

export function buildRequestStatusHistory(
  persistedRequest: PersistedServiceRequest,
) {
  return persistedRequest.history.map(toHistoryEntry);
}

export function buildRequestStatusTimeline(
  persistedRequest: PersistedServiceRequest,
) {
  const history = buildRequestStatusHistory(persistedRequest);
  const meaningfulEntries = collapseMeaningfulHistoryEntries(history);

  return meaningfulEntries.map((entry, index) =>
    toTimelineEntry(entry, index === meaningfulEntries.length - 1),
  );
}

export function buildRequestStatusResponse(
  persistedRequest: PersistedServiceRequest,
): RequestStatusResponse {
  const history = buildRequestStatusHistory(persistedRequest);
  const timeline = buildRequestStatusTimeline(persistedRequest);
  const currentHistoryEntry = history[history.length - 1];
  const currentTimelineEntry = timeline[timeline.length - 1];

  return {
    publicId: persistedRequest.publicId,
    issueLabel: persistedRequest.issueLabel,
    publicStatus: currentTimelineEntry.publicStatus,
    publicStatusLabel: currentTimelineEntry.publicStatusLabel,
    publicStatusDetail: currentTimelineEntry.publicStatusDetail,
    createdAt: persistedRequest.createdAt,
    updatedAt: currentTimelineEntry.happenedAt,
    nextStepDetail: currentHistoryEntry.nextStepDetail,
    latestChangeSummary: currentTimelineEntry.changeSummary,
    recoveryState: currentHistoryEntry.recoveryState,
    history,
    timeline,
  };
}
