import type { ActiveJobResponse } from '@handrix/contracts';
import { StatusChip } from '../../customer-dashboard/components/StatusChip';

const NEXT_ACTION: Record<string, { label: string; status: string }> = {
  ASSIGNED:   { label: 'Start Heading Over', status: 'ON_THE_WAY' },
  ON_THE_WAY: { label: "I've Arrived",       status: 'ARRIVED' },
  ARRIVED:    { label: 'Start Working',      status: 'WORKING' },
  WORKING:    { label: 'Mark Complete',      status: 'COMPLETE' },
};

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

type SheetState = 'collapsed' | 'half' | 'full';

function nextState(current: SheetState): SheetState {
  if (current === 'collapsed') return 'half';
  if (current === 'half') return 'full';
  return 'collapsed';
}

interface Props {
  job: ActiveJobResponse;
  sheetState: SheetState;
  onStateChange: (s: SheetState) => void;
  onStatusAction: (newStatus: string) => void;
  isUpdating: boolean;
}

export function ActiveJobBottomSheet({ job, sheetState, onStateChange, onStatusAction, isUpdating }: Props) {
  const nextAction = NEXT_ACTION[job.status];

  return (
    <div className={`active-job-bottom-sheet active-job-bottom-sheet--${sheetState}`}>
      <button
        className="active-job-bottom-sheet__handle"
        onClick={() => onStateChange(nextState(sheetState))}
        aria-label="Toggle detail panel"
      />

      <div aria-live="polite" className="active-job-bottom-sheet__status-row">
        <StatusChip status={job.status} />
      </div>

      {(sheetState === 'half' || sheetState === 'full') && nextAction && (
        <button
          className="btn-primary active-job-bottom-sheet__cta"
          disabled={isUpdating || !nextAction}
          onClick={() => onStatusAction(nextAction.status)}
          style={{ minHeight: 44 }}
        >
          {nextAction.label}
        </button>
      )}

      {sheetState === 'full' && (
        <>
          <p className="active-job-bottom-sheet__title">{job.title}</p>
          <p className="active-job-bottom-sheet__category">{job.categoryName}</p>
          {job.estimatedTotal != null && (
            <p className="active-job-bottom-sheet__estimate">
              {currencyFormatter.format(job.estimatedTotal)}
            </p>
          )}
          {job.description && (
            <p className="active-job-bottom-sheet__description">{job.description}</p>
          )}
        </>
      )}
    </div>
  );
}
