import type { RequestStatus } from '@handrix/contracts';

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  ON_THE_WAY: 'On the Way',
  ARRIVED: 'Arrived',
  WORKING: 'Working',
  COMPLETE: 'Complete',
  REJECTED: 'Rejected',
};

const STATUS_CLASSES: Record<RequestStatus, string> = {
  PENDING: 'status-chip status-chip--pending',
  ASSIGNED: 'status-chip status-chip--assigned',
  ON_THE_WAY: 'status-chip status-chip--active',
  ARRIVED: 'status-chip status-chip--active',
  WORKING: 'status-chip status-chip--active',
  COMPLETE: 'status-chip status-chip--complete',
  REJECTED: 'status-chip status-chip--rejected',
};

interface StatusChipProps {
  status: RequestStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  const label = STATUS_LABELS[status] ?? status;
  const className = STATUS_CLASSES[status] ?? 'status-chip';

  return (
    <span className={className} aria-label={`Status: ${label}`}>
      {label}
    </span>
  );
}
