import type { HandymanJobFeedItem } from '@handrix/contracts';
import { useAcceptJob } from '../hooks/useAcceptJob';
import { useDeclineJob } from '../hooks/useDeclineJob';

interface JobCardProps {
  job: HandymanJobFeedItem;
}

export function JobCard({ job }: JobCardProps) {
  const acceptMutation = useAcceptJob();
  const declineMutation = useDeclineJob();

  const isBusy = acceptMutation.isPending || declineMutation.isPending;

  return (
    <article className="job-card">
      <div className="job-card__chip">{job.categoryName}</div>

      <div className="job-card__distance">
        {job.distanceKm != null ? `${job.distanceKm.toFixed(1)} km` : '—'}
      </div>

      {job.roughArea != null && (
        <div className="job-card__area">{job.roughArea}</div>
      )}

      <div className="job-card__estimate">${job.estimatedTotal.toFixed(2)}</div>

      <p className="job-card__description">{job.shortDescription}</p>

      <div className="job-card__actions">
        <button
          className="btn-primary"
          onClick={() => acceptMutation.mutate(job.offerId)}
          disabled={isBusy}
          aria-label="Accept job"
        >
          {acceptMutation.isPending ? 'Accepting…' : 'Accept'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => declineMutation.mutate(job.offerId)}
          disabled={isBusy}
          aria-label="Decline job"
        >
          Decline
        </button>
      </div>

      {acceptMutation.isError && (
        <p className="job-card__error" role="alert">
          {acceptMutation.error instanceof Error
            ? acceptMutation.error.message
            : 'Failed to accept job.'}
        </p>
      )}

      {declineMutation.isError && (
        <p className="job-card__error" role="alert">
          {declineMutation.error instanceof Error
            ? declineMutation.error.message
            : 'Failed to decline job.'}
        </p>
      )}
    </article>
  );
}
