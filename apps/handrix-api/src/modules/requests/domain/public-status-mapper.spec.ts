import {
  getDerivedPublicStatusForLifecycle,
  resolvePublicStatusForLifecycleTransition,
} from './public-status-mapper';

describe('public status mapper', () => {
  it('derives the standard customer-safe status for non-review lifecycle states', () => {
    expect(getDerivedPublicStatusForLifecycle('dispatch_in_progress')).toBe(
      'dispatching',
    );
    expect(getDerivedPublicStatusForLifecycle('dispatch_delayed')).toBe(
      'delayed',
    );
    expect(getDerivedPublicStatusForLifecycle('unfulfilled')).toBe(
      'unavailable',
    );
  });

  it('moves a newly received intake request into the in-review public status without changing lifecycle state', () => {
    expect(
      resolvePublicStatusForLifecycleTransition({
        currentLifecycleState: 'intake_in_review',
        currentPublicStatus: 'received',
        nextLifecycleState: 'intake_in_review',
      }),
    ).toBe('inReview');
  });

  it('returns clarification recovery requests to the in-review public status when they move back into review', () => {
    expect(
      resolvePublicStatusForLifecycleTransition({
        currentLifecycleState: 'clarification_needed',
        currentPublicStatus: 'needsClarification',
        nextLifecycleState: 'intake_in_review',
      }),
    ).toBe('inReview');
  });
});
