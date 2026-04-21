import type {
  PublicRequestStatus,
  RequestLifecycleState,
} from '@handrix/shared-contracts';

type LifecycleTransitionSource = 'ops-status-update' | 'ops-assignment';

type TransitionInput = {
  currentLifecycleState: RequestLifecycleState;
  currentPublicStatus: PublicRequestStatus;
  nextLifecycleState: RequestLifecycleState;
  hasAssignment: boolean;
  source: LifecycleTransitionSource;
};

type TransitionValidationResult =
  | { isAllowed: true }
  | { isAllowed: false; reason: string };

const baseStatusUpdateTransitions: Record<
  RequestLifecycleState,
  RequestLifecycleState[]
> = {
  awaiting_confirmation: [],
  intake_in_review: ['clarification_needed', 'dispatch_delayed', 'unfulfilled'],
  dispatch_in_progress: [
    'dispatch_delayed',
    'clarification_needed',
    'completed',
    'unfulfilled',
  ],
  dispatch_delayed: ['clarification_needed', 'unfulfilled'],
  clarification_needed: ['intake_in_review', 'unfulfilled'],
  completed: [],
  unfulfilled: [],
};

function getStatusUpdateTransitions(input: {
  lifecycleState: RequestLifecycleState;
  publicStatus: PublicRequestStatus;
  hasAssignment: boolean;
}) {
  const transitions = [...baseStatusUpdateTransitions[input.lifecycleState]];

  if (
    input.lifecycleState === 'intake_in_review' &&
    input.publicStatus === 'received'
  ) {
    transitions.unshift('intake_in_review');
  }

  if (
    input.hasAssignment &&
    (input.lifecycleState === 'dispatch_delayed' ||
      input.lifecycleState === 'clarification_needed')
  ) {
    transitions.unshift('dispatch_in_progress');
  }

  return transitions;
}

export function getAllowedOpsStatusTransitions(input: {
  lifecycleState: RequestLifecycleState;
  publicStatus: PublicRequestStatus;
  hasAssignment: boolean;
}) {
  return getStatusUpdateTransitions(input);
}

export function validateLifecycleTransition(
  input: TransitionInput,
): TransitionValidationResult {
  if (input.source === 'ops-assignment') {
    if (input.nextLifecycleState !== 'dispatch_in_progress') {
      return {
        isAllowed: false,
        reason: 'Assignment can only move a request into dispatch in progress.',
      };
    }

    if (input.currentLifecycleState !== 'intake_in_review') {
      return {
        isAllowed: false,
        reason:
          'Only requests in intake review can move into dispatch through assignment.',
      };
    }

    if (input.currentPublicStatus !== 'inReview') {
      return {
        isAllowed: false,
        reason:
          'Complete the intake review first so the request is ready for assignment.',
      };
    }

    return { isAllowed: true };
  }

  const allowedTransitions = getStatusUpdateTransitions({
    lifecycleState: input.currentLifecycleState,
    publicStatus: input.currentPublicStatus,
    hasAssignment: input.hasAssignment,
  });

  if (allowedTransitions.includes(input.nextLifecycleState)) {
    return { isAllowed: true };
  }

  if (
    input.currentLifecycleState === 'completed' ||
    input.currentLifecycleState === 'unfulfilled'
  ) {
    return {
      isAllowed: false,
      reason:
        'This request is already in a terminal state and cannot move to another lifecycle state.',
    };
  }

  if (
    input.nextLifecycleState === 'dispatch_in_progress' &&
    !input.hasAssignment
  ) {
    return {
      isAllowed: false,
      reason:
        'Assign a fulfillment owner before moving this request back into dispatch.',
    };
  }

  if (
    input.currentLifecycleState === 'intake_in_review' &&
    input.currentPublicStatus !== 'received' &&
    input.nextLifecycleState === 'intake_in_review'
  ) {
    return {
      isAllowed: false,
      reason:
        'This request is already marked as ready for assignment and does not need another review update.',
    };
  }

  return {
    isAllowed: false,
    reason:
      'That lifecycle update is not valid from the current request state.',
  };
}
