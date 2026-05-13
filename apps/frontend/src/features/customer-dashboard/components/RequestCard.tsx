import type { ServiceRequestListItem, RequestStatus } from '@handrix/contracts';
import { StatusChip } from './StatusChip';

const ACTIVE_STATUSES = new Set<RequestStatus>([
  'PENDING',
  'ASSIGNED',
  'ON_THE_WAY',
  'ARRIVED',
  'WORKING',
]);

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface RequestCardProps {
  item: ServiceRequestListItem;
}

export function RequestCard({ item }: RequestCardProps) {
  const isActive = ACTIVE_STATUSES.has(item.status);
  const hasEstimate = item.estimatedTotal != null;

  return (
    <div
      className={`request-card${isActive ? ' request-card--active' : ''}`}
      style={{ minHeight: 44 }}
    >
      <div className="request-card__header">
        <h3 className="request-card__title">{item.title}</h3>
        <StatusChip status={item.status} />
      </div>

      <div className="request-card__meta">
        <span className="request-card__category">{item.categoryName}</span>
        <span
          className={`request-card__estimate${hasEstimate ? '' : ' request-card__estimate--pending'}`}
        >
          {hasEstimate
            ? currencyFormatter.format(item.estimatedTotal as number)
            : 'Pending estimate'}
        </span>
        {item.assignedHandymanDisplayName && (
          <span className="request-card__handyman">{item.assignedHandymanDisplayName}</span>
        )}
      </div>
    </div>
  );
}
