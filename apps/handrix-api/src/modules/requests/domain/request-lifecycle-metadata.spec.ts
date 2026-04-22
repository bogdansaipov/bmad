import {
  requestLifecycleStates,
  type RequestLifecycleState,
} from '@handrix/shared-contracts';
import {
  getRequestInterventionKindForLifecycle,
  getRequestLifecyclePresentation,
} from './request-lifecycle-metadata';

describe('request lifecycle metadata', () => {
  it('publishes a shared presentation for every lifecycle state', () => {
    const statesWithPresentation = requestLifecycleStates.map((state) => ({
      state,
      presentation: getRequestLifecyclePresentation(state),
    }));

    expect(statesWithPresentation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: 'awaiting_confirmation',
          presentation: {
            label: 'Awaiting confirmation',
            detail: 'The request has not been confirmed yet.',
          },
        }),
        expect.objectContaining({
          state: 'unfulfilled',
          presentation: {
            label: 'Unavailable',
            detail: 'The request cannot currently move forward to fulfillment.',
          },
        }),
      ]),
    );
  });

  it.each<
    [
      RequestLifecycleState,
      ReturnType<typeof getRequestInterventionKindForLifecycle>,
    ]
  >([
    ['awaiting_confirmation', null],
    ['intake_in_review', null],
    ['dispatch_in_progress', null],
    ['dispatch_delayed', 'blocker'],
    ['clarification_needed', 'clarification'],
    ['completed', null],
    ['unfulfilled', 'unavailable'],
  ])('derives the intervention kind for %s', (lifecycleState, expectedKind) => {
    expect(getRequestInterventionKindForLifecycle(lifecycleState)).toBe(
      expectedKind,
    );
  });
});
