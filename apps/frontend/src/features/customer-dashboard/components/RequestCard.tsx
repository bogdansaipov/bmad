import type { ServiceRequestListItem, RequestStatus } from '@handrix/contracts';
import { Link } from 'react-router-dom';
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

  const cardContent = (
    <>
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
      {item.status === 'COMPLETE' && !item.hasRating && (
        <div className="request-card__rate-cta">
          <span className="request-card__rate-cta-text">Rate this job ★</span>
        </div>
      )}
    </>
  );

  if (isActive) {
    return (
      <Link
        to={`/requests/${item.id}/tracking`}
        className={`request-card request-card--active request-card__link`}
        style={{ minHeight: 44, display: 'block', textDecoration: 'none', color: 'inherit' }}
        aria-label={`View tracking for ${item.title}`}
      >
        {cardContent}
      </Link>
    );
  }

  if (item.status === 'COMPLETE') {
    return (
      <Link
        to={`/requests/${item.id}/tracking`}
        className="request-card request-card--complete request-card__link"
        style={{ minHeight: 44, display: 'block', textDecoration: 'none', color: 'inherit' }}
        aria-label={`View details for ${item.title}${!item.hasRating ? ' — rate this job' : ''}`}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div className="request-card" style={{ minHeight: 44 }}>
      {cardContent}
    </div>
  );
}
