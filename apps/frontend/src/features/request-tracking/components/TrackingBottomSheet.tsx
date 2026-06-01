import type { RequestTrackingResponse } from '@handrix/contracts';
import { StatusChip } from '../../customer-dashboard/components/StatusChip';
import { BottomSheet, type BottomSheetState } from '../../shared/components/BottomSheet';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface TrackingBottomSheetProps {
  tracking: RequestTrackingResponse;
  sheetState: BottomSheetState;
  onStateChange: (state: BottomSheetState) => void;
}

export function TrackingBottomSheet({ tracking, sheetState, onStateChange }: TrackingBottomSheetProps) {
  return (
    <BottomSheet
      state={sheetState}
      onStateChange={onStateChange}
      className="tracking-bottom-sheet"
      aria-label="Toggle tracking details"
    >
      <div className="tracking-bottom-sheet__status-row">
        <StatusChip status={tracking.status} />
        {tracking.status === 'PENDING' && sheetState === 'collapsed' && (
          <span className="tracking-bottom-sheet__pending-hint">Matching nearby pros…</span>
        )}
      </div>

      {(sheetState === 'half' || sheetState === 'full') && (
        <>
          {tracking.assignedHandymanDisplayName && (
            <p className="tracking-bottom-sheet__handyman">{tracking.assignedHandymanDisplayName}</p>
          )}
          {tracking.estimatedTotal != null && (
            <p className="tracking-bottom-sheet__estimate">
              {currencyFormatter.format(tracking.estimatedTotal)}
            </p>
          )}
          <p className="tracking-bottom-sheet__title">{tracking.title}</p>
          <p className="tracking-bottom-sheet__category">{tracking.categoryName}</p>
          {tracking.description && (
            <p className="tracking-bottom-sheet__description">{tracking.description}</p>
          )}
        </>
      )}
    </BottomSheet>
  );
}
