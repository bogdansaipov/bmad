import type { RequestTrackingResponse } from '@handrix/contracts';
import { StatusChip } from '../../customer-dashboard/components/StatusChip';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

type SheetState = 'collapsed' | 'half' | 'full';

interface TrackingBottomSheetProps {
  tracking: RequestTrackingResponse;
  sheetState: SheetState;
  onStateChange: (state: SheetState) => void;
}

function nextState(current: SheetState): SheetState {
  if (current === 'collapsed') return 'half';
  if (current === 'half') return 'full';
  return 'collapsed';
}

export function TrackingBottomSheet({ tracking, sheetState, onStateChange }: TrackingBottomSheetProps) {
  return (
    <div className={`tracking-bottom-sheet tracking-bottom-sheet--${sheetState}`}>
      <button
        className="tracking-bottom-sheet__handle"
        onClick={() => onStateChange(nextState(sheetState))}
        aria-label="Toggle detail panel"
      />

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
        </>
      )}

      {sheetState === 'full' && (
        <>
          <p className="tracking-bottom-sheet__title">{tracking.title}</p>
          <p className="tracking-bottom-sheet__category">{tracking.categoryName}</p>
          {tracking.description && (
            <p className="tracking-bottom-sheet__description">{tracking.description}</p>
          )}
        </>
      )}
    </div>
  );
}
