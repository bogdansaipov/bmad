import { useState } from 'react';
import type { RatingStatusResponse } from '@handrix/contracts';

interface Props {
  requestId: string;
  ratingStatus: RatingStatusResponse | undefined;
  isLoadingStatus: boolean;
  onSubmit: (stars: number, shortFeedback?: string) => void;
  onDismiss: () => void;
  isSubmitting: boolean;
}

export function RatingPromptSheet({
  ratingStatus,
  isLoadingStatus,
  onSubmit,
  onDismiss,
  isSubmitting,
}: Props) {
  const [selectedStars, setSelectedStars] = useState<number>(0);
  const [feedback, setFeedback] = useState('');

  if (isLoadingStatus) return null;

  if (ratingStatus?.hasRating) {
    return (
      <div className="rating-prompt-sheet rating-prompt-sheet--rated" role="region" aria-label="Your rating">
        <p className="rating-prompt-sheet__rated-label">You rated this job</p>
        <div className="rating-prompt-sheet__stars" aria-label={`${ratingStatus.stars} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={`rating-star${s <= (ratingStatus.stars ?? 0) ? ' rating-star--filled' : ''}`}
              aria-hidden="true"
            >
              ★
            </span>
          ))}
        </div>
        {ratingStatus.shortFeedback && (
          <p className="rating-prompt-sheet__feedback-display">{ratingStatus.shortFeedback}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rating-prompt-sheet" role="dialog" aria-label="Rate your experience" aria-modal="false">
      <div className="rating-prompt-sheet__header">
        <p className="rating-prompt-sheet__title">How did the job go?</p>
        <button
          className="rating-prompt-sheet__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss rating prompt"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          ✕
        </button>
      </div>

      <div className="rating-prompt-sheet__stars" role="group" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            className={`rating-star rating-star--btn${s <= selectedStars ? ' rating-star--filled' : ''}`}
            onClick={() => setSelectedStars(s)}
            aria-label={`${s} star${s !== 1 ? 's' : ''}`}
            aria-pressed={s <= selectedStars}
            style={{ minHeight: 44, minWidth: 44 }}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        className="rating-prompt-sheet__feedback"
        placeholder="Optional feedback (max 500 characters)"
        maxLength={500}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        aria-label="Optional feedback"
        rows={2}
      />

      <button
        className="btn-primary rating-prompt-sheet__submit"
        onClick={() => onSubmit(selectedStars, feedback || undefined)}
        disabled={selectedStars === 0 || isSubmitting}
        style={{ minHeight: 44 }}
      >
        {isSubmitting ? 'Submitting…' : 'Submit Rating'}
      </button>
    </div>
  );
}
