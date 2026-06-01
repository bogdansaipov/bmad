import { Link } from 'react-router-dom';
import { JOB_OFFER_STATUS, type HandymanJobHistoryItem } from '@handrix/contracts';

const REQUEST_STATUS_LABELS: Record<string, string> = {
  COMPLETE: 'Completed',
  ASSIGNED: 'Assigned',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  ON_THE_WAY: 'On the way',
  ARRIVED: 'Arrived',
  WORKING: 'Working',
};

const ACTIVE_REQUEST_STATUSES = new Set(['ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'WORKING']);

interface JobHistoryRowProps {
  item: HandymanJobHistoryItem;
}

export function JobHistoryRow({ item }: JobHistoryRowProps) {
  const truncatedDescription =
    item.requestDescription.length > 120
      ? `${item.requestDescription.slice(0, 120)}…`
      : item.requestDescription;

  const offerStatusClass =
    item.offerStatus === JOB_OFFER_STATUS.ACCEPTED
      ? 'job-history-row__badge job-history-row__badge--accepted'
      : 'job-history-row__badge job-history-row__badge--muted';

  const respondedDate = item.respondedAt
    ? new Date(item.respondedAt).toLocaleDateString()
    : null;

  const isActive =
    item.offerStatus === JOB_OFFER_STATUS.ACCEPTED &&
    ACTIVE_REQUEST_STATUSES.has(item.requestStatus);

  const cardContent = (
    <>
      <div className="job-card__chip">{item.categoryName}</div>
      <span className={offerStatusClass}>
        {item.offerStatus.charAt(0).toUpperCase() + item.offerStatus.slice(1)}
      </span>
      <div className="job-history-row__title">{item.requestTitle}</div>
      {truncatedDescription && (
        <p className="job-card__description">{truncatedDescription}</p>
      )}
      <div className="job-card__estimate">${item.estimatedTotal.toFixed(2)}</div>
      <div className="job-history-row__request-status">
        {REQUEST_STATUS_LABELS[item.requestStatus] ?? item.requestStatus}
      </div>
      {respondedDate && (
        <div className="job-history-row__date">{respondedDate}</div>
      )}
    </>
  );

  if (isActive) {
    return (
      <Link
        to={`/jobs/${item.requestId}/active`}
        className="job-card job-card--active"
        style={{ minHeight: 44, display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}
        aria-label={`View active job: ${item.requestTitle}`}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <article className="job-card" style={{ minHeight: 44 }}>
      {cardContent}
    </article>
  );
}
