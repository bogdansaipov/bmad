import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RatingPromptSheet } from './RatingPromptSheet';
import type { RatingStatusResponse } from '@handrix/contracts';

vi.mock('@handrix/contracts', () => ({
  // RatingPromptSheet only uses the type, not the schema at runtime
}));

const baseProps = {
  requestId: 'req-1',
  ratingStatus: undefined,
  isLoadingStatus: false,
  onSubmit: vi.fn(),
  onDismiss: vi.fn(),
  isSubmitting: false,
};

const unratedStatus: RatingStatusResponse = {
  requestId: 'req-1',
  hasRating: false,
  stars: null,
  shortFeedback: null,
};

const ratedStatus: RatingStatusResponse = {
  requestId: 'req-1',
  hasRating: true,
  stars: 4,
  shortFeedback: 'Great work!',
};

describe('RatingPromptSheet', () => {
  it('renders nothing while loading', () => {
    const { container } = render(<RatingPromptSheet {...baseProps} isLoadingStatus={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders rating prompt when not yet rated', () => {
    render(<RatingPromptSheet {...baseProps} ratingStatus={unratedStatus} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('How did the job go?')).toBeInTheDocument();
  });

  it('renders 5 star buttons', () => {
    render(<RatingPromptSheet {...baseProps} ratingStatus={unratedStatus} />);
    const starButtons = screen.getAllByRole('button', { name: /star/ });
    // 5 star buttons + dismiss button = 6 total buttons; filter by star label
    expect(starButtons.length).toBe(5);
  });

  it('submit button is disabled when no stars selected', () => {
    render(<RatingPromptSheet {...baseProps} ratingStatus={unratedStatus} />);
    expect(screen.getByRole('button', { name: 'Submit Rating' })).toBeDisabled();
  });

  it('submit button is enabled after selecting stars', () => {
    render(<RatingPromptSheet {...baseProps} ratingStatus={unratedStatus} />);
    fireEvent.click(screen.getByRole('button', { name: '3 stars' }));
    expect(screen.getByRole('button', { name: 'Submit Rating' })).not.toBeDisabled();
  });

  it('calls onSubmit with stars and undefined feedback when no feedback entered', () => {
    const onSubmit = vi.fn();
    render(<RatingPromptSheet {...baseProps} ratingStatus={unratedStatus} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '5 stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Rating' }));
    expect(onSubmit).toHaveBeenCalledWith(5, undefined);
  });

  it('calls onSubmit with stars and feedback when feedback entered', () => {
    const onSubmit = vi.fn();
    render(<RatingPromptSheet {...baseProps} ratingStatus={unratedStatus} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '4 stars' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Good job' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Rating' }));
    expect(onSubmit).toHaveBeenCalledWith(4, 'Good job');
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<RatingPromptSheet {...baseProps} ratingStatus={unratedStatus} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss rating prompt' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders rated view with stars and feedback when already rated', () => {
    render(<RatingPromptSheet {...baseProps} ratingStatus={ratedStatus} />);
    expect(screen.getByRole('region', { name: 'Your rating' })).toBeInTheDocument();
    expect(screen.getByText('You rated this job')).toBeInTheDocument();
    expect(screen.getByText('Great work!')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not show re-rate option in rated view', () => {
    render(<RatingPromptSheet {...baseProps} ratingStatus={ratedStatus} />);
    expect(screen.queryByRole('button', { name: 'Submit Rating' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss rating prompt' })).not.toBeInTheDocument();
  });

  it('shows submitting label when isSubmitting is true', () => {
    render(<RatingPromptSheet {...baseProps} ratingStatus={unratedStatus} isSubmitting={true} />);
    // submit button disabled with 'Submitting…' label (no stars selected anyway)
    const submitBtn = screen.getByRole('button', { name: 'Submitting…' });
    expect(submitBtn).toBeDisabled();
  });
});
