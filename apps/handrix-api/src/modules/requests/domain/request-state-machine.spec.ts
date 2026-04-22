import {
  getAllowedOpsStatusTransitions,
  validateLifecycleTransition,
} from './request-state-machine';

describe('request state machine', () => {
  it('allows the first protected review progression from received to inReview without changing lifecycle', () => {
    expect(
      getAllowedOpsStatusTransitions({
        lifecycleState: 'intake_in_review',
        publicStatus: 'received',
        hasAssignment: false,
      }),
    ).toContain('intake_in_review');
  });

  it('allows dispatch recovery requests to resume dispatch only when an assignment already exists', () => {
    expect(
      getAllowedOpsStatusTransitions({
        lifecycleState: 'dispatch_delayed',
        publicStatus: 'delayed',
        hasAssignment: true,
      }),
    ).toContain('dispatch_in_progress');

    expect(
      getAllowedOpsStatusTransitions({
        lifecycleState: 'dispatch_delayed',
        publicStatus: 'delayed',
        hasAssignment: false,
      }),
    ).not.toContain('dispatch_in_progress');
  });

  it('rejects direct ops status updates into dispatch when no assignment exists', () => {
    expect(
      validateLifecycleTransition({
        currentLifecycleState: 'clarification_needed',
        currentPublicStatus: 'needsClarification',
        nextLifecycleState: 'dispatch_in_progress',
        hasAssignment: false,
        source: 'ops-status-update',
      }),
    ).toEqual({
      isAllowed: false,
      reason:
        'Assign a fulfillment owner before moving this request back into dispatch.',
    });
  });

  it('keeps assignment-driven dispatch moves constrained to reviewed intake requests', () => {
    expect(
      validateLifecycleTransition({
        currentLifecycleState: 'intake_in_review',
        currentPublicStatus: 'inReview',
        nextLifecycleState: 'dispatch_in_progress',
        hasAssignment: false,
        source: 'ops-assignment',
      }),
    ).toEqual({ isAllowed: true });

    expect(
      validateLifecycleTransition({
        currentLifecycleState: 'intake_in_review',
        currentPublicStatus: 'received',
        nextLifecycleState: 'dispatch_in_progress',
        hasAssignment: false,
        source: 'ops-assignment',
      }),
    ).toEqual({
      isAllowed: false,
      reason:
        'Complete the intake review first so the request is ready for assignment.',
    });
  });

  it('allows support interventions only for clarification, blocker, or unavailable outcomes', () => {
    expect(
      validateLifecycleTransition({
        currentLifecycleState: 'dispatch_in_progress',
        currentPublicStatus: 'dispatching',
        nextLifecycleState: 'clarification_needed',
        hasAssignment: true,
        source: 'support-intervention',
      }),
    ).toEqual({ isAllowed: true });

    expect(
      validateLifecycleTransition({
        currentLifecycleState: 'dispatch_in_progress',
        currentPublicStatus: 'dispatching',
        nextLifecycleState: 'dispatch_in_progress',
        hasAssignment: true,
        source: 'support-intervention',
      }),
    ).toEqual({
      isAllowed: false,
      reason:
        'Support follow-up can only record clarification, blocker, or unavailable outcomes.',
    });
  });
});
