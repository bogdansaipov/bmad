import { z } from 'zod';

export const OBSERVABILITY_EVENT_NAMES = {
  flowStarted: 'flow.started',
  issueSelected: 'issue.selected',
  requestIntakeEvaluated: 'request.intake.evaluated',
  requestConfirmed: 'request.confirmed',
  requestStatusLookedUp: 'request.status.looked_up',
  requestCancelled: 'request.cancelled',
  fulfillmentOutcomeRecorded: 'fulfillment.outcome_recorded',
  // Aliased to the pre-existing support.request.opened event — there is no
  // separate "contact" action yet; the MVP metric measures support engagement
  // with a request detail view.
  supportContactInitiated: 'support.request.opened',
  supportRequestOpened: 'support.request.opened',
  supportRequestInterventionRecorded: 'support.request.intervention_recorded',
} as const;

export type ObservabilityEventName =
  (typeof OBSERVABILITY_EVENT_NAMES)[keyof typeof OBSERVABILITY_EVENT_NAMES];

const uniqueEventNames = Array.from(
  new Set(Object.values(OBSERVABILITY_EVENT_NAMES)),
) as [ObservabilityEventName, ...ObservabilityEventName[]];

export const observabilityEventNameSchema = z.enum(uniqueEventNames);

export const PUBLIC_INGESTIBLE_EVENT_NAMES: ReadonlyArray<ObservabilityEventName> =
  [OBSERVABILITY_EVENT_NAMES.flowStarted];

const MAX_METADATA_KEYS = 16;
const MAX_METADATA_BYTES = 2048;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

const boundedMetadataSchema = z
  .record(z.string().max(64), z.unknown())
  .refine((value) => Object.keys(value).length <= MAX_METADATA_KEYS, {
    message: `metadata may have at most ${MAX_METADATA_KEYS} keys`,
  })
  .refine(
    (value) => {
      try {
        return JSON.stringify(value).length <= MAX_METADATA_BYTES;
      } catch {
        return false;
      }
    },
    { message: `metadata JSON must not exceed ${MAX_METADATA_BYTES} bytes` },
  );

export const publicObservabilityEventIngestionSchema = z.object({
  eventName: z.enum([OBSERVABILITY_EVENT_NAMES.flowStarted]),
  sessionId: z.string().regex(SESSION_ID_PATTERN).optional(),
  metadata: boundedMetadataSchema.optional(),
});

export type PublicObservabilityEventIngestionRequest = z.infer<
  typeof publicObservabilityEventIngestionSchema
>;
