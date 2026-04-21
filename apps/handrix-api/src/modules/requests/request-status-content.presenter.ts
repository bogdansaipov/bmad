import type { PublicRequestStatus } from '@handrix/shared-contracts';

export function getTrackingStatusContent(publicStatus: PublicRequestStatus) {
  switch (publicStatus) {
    case 'received':
    case 'inReview':
      return {
        nextStepDetail:
          'Handrix is reviewing your request details and service location before the next update.',
      };
    case 'dispatching':
      return {
        nextStepDetail:
          'Handrix is actively moving this request forward and will share the next service update as progress changes.',
      };
    case 'delayed':
      return {
        nextStepDetail:
          'This request is still active, but the next service update may take longer than originally expected while Handrix works through the delay.',
        fallbackGuidance:
          'If timing changes create a new concern, use the next Handrix update to decide whether the current request should continue or shift to a safer fallback path.',
      };
    case 'needsClarification':
      return {
        nextStepDetail:
          'This request needs one more clarification before it can continue, and the next update should explain what to do.',
      };
    case 'completed':
      return {
        nextStepDetail:
          'This request has reached its completed state, so no additional action is needed right now.',
      };
    case 'unavailable':
      return {
        nextStepDetail:
          'This request cannot continue through the current service path, and the next update should explain the safest fallback option.',
        fallbackGuidance:
          'Review the fallback path carefully before deciding whether to start a new request or seek a different support option.',
      };
  }
}
