import type {
  PublicRequestStatus,
  RequestRecoveryState,
} from '@handrix/shared-contracts';

const recoveryStateByStatus: Partial<
  Record<PublicRequestStatus, RequestRecoveryState>
> = {
  needsClarification: {
    kind: 'clarification',
    title: 'We need one more detail before this request can continue.',
    detail:
      'This request is paused until one important clarification is confirmed, and the next update should tell you exactly what still needs attention.',
    expectationUpdate:
      'Progress will stay paused until the missing detail is confirmed clearly.',
    nextActionLabel: 'Confirm the missing detail',
    nextActionDetail:
      'Use the next Handrix update to confirm the requested detail so scheduling can continue.',
  },
  delayed: {
    kind: 'delay',
    title: 'This request is still moving, but the timing has changed.',
    detail:
      'The service path is still active, but a delay now affects when the next milestone can happen.',
    expectationUpdate:
      'Expect a slower next update than originally expected while Handrix works through the delay.',
    nextActionLabel: 'Watch for the revised update',
    nextActionDetail:
      'Handrix will share the next timing update as soon as the revised fulfillment path is confirmed.',
  },
  unavailable: {
    kind: 'unavailable',
    title: 'This request cannot continue through the current service path.',
    detail:
      'The current fulfillment route is no longer available, so this request needs a different next step instead of normal dispatch progress.',
    expectationUpdate:
      'Do not expect standard dispatch updates while Handrix points you toward the safest fallback option.',
    nextActionLabel: 'Review the fallback path',
    nextActionDetail:
      'Use the fallback guidance below to decide the best next move for this request.',
    fallbackGuidance:
      'If this service path no longer fits, use the fallback guidance in this update or begin a new guided request if the situation changes.',
  },
};

export function getRequestRecoveryState(
  publicStatus: PublicRequestStatus,
): RequestRecoveryState | null {
  return recoveryStateByStatus[publicStatus] ?? null;
}
