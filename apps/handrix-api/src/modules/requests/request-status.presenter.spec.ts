import {
  type PublicRequestStatusPresentation,
  publicRequestStatusPresentationSchema,
} from '@handrix/shared-contracts';
import {
  getPublicRequestStatusPresentation,
  resolvePublicRequestStatusPresentation,
} from './request-status.presenter';

describe('request status presenter', () => {
  it.each([
    ['received', 'Request received'],
    ['inReview', 'Under review'],
    ['dispatching', 'Dispatch in progress'],
    ['delayed', 'Dispatch delayed'],
    ['needsClarification', 'More details needed'],
    ['completed', 'Request completed'],
    ['unavailable', 'Service unavailable'],
  ] as const)(
    'returns a customer-safe presentation for %s',
    (publicStatus, expectedLabel) => {
      const presentation = getPublicRequestStatusPresentation(publicStatus);

      expect(publicRequestStatusPresentationSchema.parse(presentation)).toEqual(
        expect.objectContaining({
          publicStatus,
          publicStatusLabel: expectedLabel,
        }),
      );
    },
  );

  it('allows intake review requests to surface the received public status', () => {
    const presentation = resolvePublicRequestStatusPresentation({
      lifecycleState: 'intake_in_review',
      publicStatus: 'received',
    });

    const parsedPresentation: PublicRequestStatusPresentation =
      publicRequestStatusPresentationSchema.parse(presentation);

    expect(parsedPresentation.publicStatus).toBe('received');
    expect(parsedPresentation.publicStatusLabel).toBe('Request received');
  });

  it('allows delayed lifecycle requests to surface the delayed public status', () => {
    const presentation = resolvePublicRequestStatusPresentation({
      lifecycleState: 'dispatch_delayed',
      publicStatus: 'delayed',
    });

    const parsedPresentation: PublicRequestStatusPresentation =
      publicRequestStatusPresentationSchema.parse(presentation);

    expect(parsedPresentation.publicStatus).toBe('delayed');
    expect(parsedPresentation.publicStatusLabel).toBe('Dispatch delayed');
  });

  it('rejects contradictory lifecycle and public-status combinations', () => {
    expect(() =>
      resolvePublicRequestStatusPresentation({
        lifecycleState: 'dispatch_in_progress',
        publicStatus: 'received',
      }),
    ).toThrow(
      'Unsupported public status "received" for lifecycle state "dispatch_in_progress".',
    );
  });
});
