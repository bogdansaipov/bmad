import type { RequestLifecycleState } from '@handrix/shared-contracts';

type RequestLifecyclePresentation = {
  label: string;
  detail: string;
};

export type RequestLifecycleInterventionKind =
  | 'clarification'
  | 'blocker'
  | 'unavailable';

const lifecyclePresentationByState: Record<
  RequestLifecycleState,
  RequestLifecyclePresentation
> = {
  awaiting_confirmation: {
    label: 'Awaiting confirmation',
    detail: 'The request has not been confirmed yet.',
  },
  intake_in_review: {
    label: 'Intake in review',
    detail:
      'Operations is still reviewing the intake details before assignment.',
  },
  dispatch_in_progress: {
    label: 'Dispatch in progress',
    detail: 'The request is moving through dispatch after review.',
  },
  dispatch_delayed: {
    label: 'Dispatch delayed',
    detail: 'A blocker is slowing fulfillment and may require intervention.',
  },
  clarification_needed: {
    label: 'Clarification needed',
    detail:
      'The request needs additional detail before fulfillment can continue.',
  },
  completed: {
    label: 'Completed',
    detail: 'The request lifecycle is complete.',
  },
  unfulfilled: {
    label: 'Unavailable',
    detail: 'The request cannot currently move forward to fulfillment.',
  },
};

export function getRequestLifecyclePresentation(
  lifecycleState: RequestLifecycleState,
): RequestLifecyclePresentation {
  return lifecyclePresentationByState[lifecycleState];
}

export function getRequestInterventionKindForLifecycle(
  lifecycleState: RequestLifecycleState,
): RequestLifecycleInterventionKind | null {
  switch (lifecycleState) {
    case 'clarification_needed':
      return 'clarification';
    case 'dispatch_delayed':
      return 'blocker';
    case 'unfulfilled':
      return 'unavailable';
    case 'awaiting_confirmation':
    case 'intake_in_review':
    case 'dispatch_in_progress':
    case 'completed':
      return null;
  }
}
