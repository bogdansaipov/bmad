import type { RequestTrackingCredential } from '@handrix/shared-contracts';
import { createHmac, timingSafeEqual } from 'node:crypto';

const TRACKING_TOKEN_SECRET =
  process.env.HANDRIX_REQUEST_TOKEN_SECRET?.trim() ||
  'handrix-local-tracking-secret';

type RequestTrackingTokenPayload = {
  publicId: string;
  issuedAt: string;
  expiresAt: string;
  scope: 'request-status';
};

function getTokenSignature(payloadBase64: string) {
  return createHmac('sha256', TRACKING_TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64url');
}

function parseTrackingToken(token: string): RequestTrackingTokenPayload {
  const [payloadBase64, signature] = token.split('.');

  if (!payloadBase64 || !signature) {
    throw new Error('Invalid request tracking credential.');
  }

  const expectedSignature = getTokenSignature(payloadBase64);
  const providedSignatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error('Invalid request tracking credential.');
  }

  let payload: unknown;

  try {
    payload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8'),
    ) as unknown;
  } catch {
    throw new Error('Invalid request tracking credential.');
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid request tracking credential.');
  }

  const parsedPayload = payload as Partial<RequestTrackingTokenPayload>;

  if (
    typeof parsedPayload.publicId !== 'string' ||
    typeof parsedPayload.issuedAt !== 'string' ||
    typeof parsedPayload.expiresAt !== 'string' ||
    parsedPayload.scope !== 'request-status'
  ) {
    throw new Error('Invalid request tracking credential.');
  }

  if (
    Number.isNaN(Date.parse(parsedPayload.issuedAt)) ||
    Number.isNaN(Date.parse(parsedPayload.expiresAt))
  ) {
    throw new Error('Invalid request tracking credential.');
  }

  return parsedPayload as RequestTrackingTokenPayload;
}

export function issueRequestTrackingCredential(
  publicId: string,
  issuedAt: string,
): RequestTrackingCredential {
  const expiresAt = new Date(
    new Date(issuedAt).getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const payloadBase64 = Buffer.from(
    JSON.stringify({
      publicId,
      issuedAt,
      expiresAt,
      scope: 'request-status',
    } satisfies RequestTrackingTokenPayload),
  ).toString('base64url');
  const signature = getTokenSignature(payloadBase64);

  return {
    token: `${payloadBase64}.${signature}`,
    expiresAt,
  };
}

export function validateRequestTrackingCredential(input: {
  publicId: string;
  token: string;
  expectedToken?: string;
  now?: Date;
}) {
  const payload = parseTrackingToken(input.token);

  if (payload.publicId !== input.publicId) {
    throw new Error('Invalid request tracking credential.');
  }

  if (
    input.expectedToken !== undefined &&
    input.expectedToken.trim().length > 0 &&
    input.expectedToken !== input.token
  ) {
    throw new Error('Invalid request tracking credential.');
  }

  const now = input.now ?? new Date();

  if (new Date(payload.expiresAt).getTime() <= now.getTime()) {
    throw new Error('Invalid request tracking credential.');
  }

  return payload;
}
