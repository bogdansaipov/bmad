import type {
  PublicRequestStatus,
  PublicRequestStatusPresentation,
} from '@handrix/shared-contracts';
import type { RequestLifecycleState } from './request-store.service';

const publicStatusPresentationByStatus: Record<
  PublicRequestStatus,
  Omit<PublicRequestStatusPresentation, 'publicStatus'>
> = {
  received: {
    publicStatusLabel: 'Request received',
    publicStatusDetail:
      'Our team is reviewing your issue details and service location so we can confirm the best next step.',
  },
  inReview: {
    publicStatusLabel: 'Under review',
    publicStatusDetail:
      'Your request is being reviewed so we can confirm the right fulfillment path and next update.',
  },
  dispatching: {
    publicStatusLabel: 'Dispatch in progress',
    publicStatusDetail:
      'A Handrix team member is actively moving this request forward and preparing the next service update.',
  },
  delayed: {
    publicStatusLabel: 'Dispatch delayed',
    publicStatusDetail:
      'This request is still active, but the expected progress timing has changed and the next update should explain the revised expectation clearly.',
  },
  needsClarification: {
    publicStatusLabel: 'More details needed',
    publicStatusDetail:
      'We need one more clarification before this request can keep moving, and we will guide you through the next step clearly.',
  },
  completed: {
    publicStatusLabel: 'Request completed',
    publicStatusDetail:
      'This request has reached its final completed state and no more action is needed right now.',
  },
  unavailable: {
    publicStatusLabel: 'Service unavailable',
    publicStatusDetail:
      'This request cannot move forward through the current service path, and the next update should explain the best fallback option.',
  },
};

const allowedPublicStatusesByLifecycle: Record<
  RequestLifecycleState,
  readonly PublicRequestStatus[]
> = {
  awaiting_confirmation: ['received'],
  intake_in_review: ['received', 'inReview'],
  dispatch_in_progress: ['dispatching'],
  dispatch_delayed: ['delayed'],
  clarification_needed: ['needsClarification'],
  completed: ['completed'],
  unfulfilled: ['unavailable'],
};

export function getPublicRequestStatusPresentation(
  publicStatus: PublicRequestStatus,
): PublicRequestStatusPresentation {
  const presentation = publicStatusPresentationByStatus[publicStatus];

  return {
    publicStatus,
    publicStatusLabel: presentation.publicStatusLabel,
    publicStatusDetail: presentation.publicStatusDetail,
  };
}

export function resolvePublicRequestStatusPresentation(input: {
  lifecycleState: RequestLifecycleState;
  publicStatus: PublicRequestStatus;
}): PublicRequestStatusPresentation {
  const allowedPublicStatuses =
    allowedPublicStatusesByLifecycle[input.lifecycleState];

  if (!allowedPublicStatuses.includes(input.publicStatus)) {
    throw new Error(
      `Unsupported public status "${input.publicStatus}" for lifecycle state "${input.lifecycleState}".`,
    );
  }

  return getPublicRequestStatusPresentation(input.publicStatus);
}
