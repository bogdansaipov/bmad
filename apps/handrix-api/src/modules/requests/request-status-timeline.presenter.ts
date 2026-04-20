import type {
  RequestStatusTimelineEntry,
  RequestStatusResponse,
} from '@handrix/shared-contracts';
import { getRequestRecoveryState } from './request-status-recovery.presenter';
import { getPublicRequestStatusPresentation } from './request-status.presenter';
import type {
  PersistedRequestHistoryEntry,
  PersistedServiceRequest,
} from './request-store.service';

function collapseMeaningfulHistoryEntries(
  history: PersistedRequestHistoryEntry[],
) {
  const meaningfulEntries: PersistedRequestHistoryEntry[] = [];

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
  entry: PersistedRequestHistoryEntry,
  isCurrent: boolean,
): RequestStatusTimelineEntry {
  const presentation = getPublicRequestStatusPresentation(entry.publicStatus);

  return {
    ...presentation,
    happenedAt: entry.createdAt,
    isCurrent,
    changeSummary: entry.note,
  };
}

export function buildRequestStatusTimeline(
  persistedRequest: PersistedServiceRequest,
) {
  const meaningfulEntries = collapseMeaningfulHistoryEntries(
    persistedRequest.history,
  );

  return meaningfulEntries.map((entry, index) =>
    toTimelineEntry(entry, index === meaningfulEntries.length - 1),
  );
}

export function buildRequestStatusResponse(
  persistedRequest: PersistedServiceRequest,
  trackingContent: {
    nextStepDetail: string;
    latestChangeSummary?: string;
    fallbackGuidance?: string;
  },
): RequestStatusResponse {
  const timeline = buildRequestStatusTimeline(persistedRequest);
  const currentTimelineEntry = timeline[timeline.length - 1];
  const recoveryState = getRequestRecoveryState(
    currentTimelineEntry.publicStatus,
  );

  return {
    publicId: persistedRequest.publicId,
    issueLabel: persistedRequest.issueLabel,
    publicStatus: currentTimelineEntry.publicStatus,
    publicStatusLabel: currentTimelineEntry.publicStatusLabel,
    publicStatusDetail: currentTimelineEntry.publicStatusDetail,
    createdAt: persistedRequest.createdAt,
    updatedAt: currentTimelineEntry.happenedAt,
    nextStepDetail: trackingContent.nextStepDetail,
    latestChangeSummary:
      trackingContent.latestChangeSummary ?? currentTimelineEntry.changeSummary,
    recoveryState:
      recoveryState === null
        ? null
        : {
            ...recoveryState,
            fallbackGuidance:
              trackingContent.fallbackGuidance ??
              recoveryState.fallbackGuidance,
          },
    timeline,
  };
}
