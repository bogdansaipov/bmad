import type {
  PublicRequestStatus,
  RequestLifecycleState,
} from '@handrix/shared-contracts';

type LifecycleTransitionPublicStatusInput = {
  currentLifecycleState: RequestLifecycleState;
  currentPublicStatus: PublicRequestStatus;
  nextLifecycleState: RequestLifecycleState;
};

const derivedPublicStatusByLifecycle: Record<
  RequestLifecycleState,
  PublicRequestStatus
> = {
  awaiting_confirmation: 'received',
  intake_in_review: 'inReview',
  dispatch_in_progress: 'dispatching',
  dispatch_delayed: 'delayed',
  clarification_needed: 'needsClarification',
  completed: 'completed',
  unfulfilled: 'unavailable',
};

export function getDerivedPublicStatusForLifecycle(
  lifecycleState: RequestLifecycleState,
): PublicRequestStatus {
  return derivedPublicStatusByLifecycle[lifecycleState];
}

export function resolvePublicStatusForLifecycleTransition(
  input: LifecycleTransitionPublicStatusInput,
): PublicRequestStatus {
  if (input.nextLifecycleState !== 'intake_in_review') {
    return getDerivedPublicStatusForLifecycle(input.nextLifecycleState);
  }

  if (
    input.currentLifecycleState === 'intake_in_review' &&
    input.currentPublicStatus === 'received'
  ) {
    return 'inReview';
  }

  return 'inReview';
}
