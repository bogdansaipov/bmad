import { createHmac, timingSafeEqual } from 'node:crypto';
import type { InternalUserRole } from '@handrix/shared-contracts';
import type { AuthenticatedInternalUser } from './internal-auth.types';

type InternalJwtPayload = {
  sub: string;
  email: string;
  displayName: string;
  role: InternalUserRole;
  iss: string;
  aud: 'handrix-internal';
  iat: number;
  exp: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signSegment(input: string, secret: string) {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function assertMatchingSignature(
  input: string,
  signature: string,
  secret: string,
) {
  const expectedSignature = signSegment(input, secret);
  const providedSignatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error('Invalid internal access token.');
  }
}

function parsePayload(token: string, secret: string): InternalJwtPayload {
  const [headerSegment, payloadSegment, signatureSegment] = token.split('.');

  if (!headerSegment || !payloadSegment || !signatureSegment) {
    throw new Error('Invalid internal access token.');
  }

  assertMatchingSignature(
    `${headerSegment}.${payloadSegment}`,
    signatureSegment,
    secret,
  );

  let header: unknown;
  let payload: unknown;

  try {
    header = JSON.parse(fromBase64Url(headerSegment)) as unknown;
    payload = JSON.parse(fromBase64Url(payloadSegment)) as unknown;
  } catch {
    throw new Error('Invalid internal access token.');
  }

  if (
    typeof header !== 'object' ||
    header === null ||
    (header as { alg?: string }).alg !== 'HS256' ||
    (header as { typ?: string }).typ !== 'JWT'
  ) {
    throw new Error('Invalid internal access token.');
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid internal access token.');
  }

  const parsedPayload = payload as Partial<InternalJwtPayload>;

  if (
    typeof parsedPayload.sub !== 'string' ||
    typeof parsedPayload.email !== 'string' ||
    typeof parsedPayload.displayName !== 'string' ||
    (parsedPayload.role !== 'ops' && parsedPayload.role !== 'support') ||
    typeof parsedPayload.iss !== 'string' ||
    parsedPayload.aud !== 'handrix-internal' ||
    typeof parsedPayload.iat !== 'number' ||
    typeof parsedPayload.exp !== 'number'
  ) {
    throw new Error('Invalid internal access token.');
  }

  return parsedPayload as InternalJwtPayload;
}

export function issueInternalAccessToken(input: {
  secret: string;
  issuer: string;
  ttlMinutes: number;
  user: AuthenticatedInternalUser;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const issuedAtSeconds = Math.floor(now.getTime() / 1000);
  const expiresAtSeconds = issuedAtSeconds + input.ttlMinutes * 60;

  const headerSegment = toBase64Url(
    JSON.stringify({
      alg: 'HS256',
      typ: 'JWT',
    }),
  );
  const payloadSegment = toBase64Url(
    JSON.stringify({
      sub: input.user.id,
      email: input.user.email,
      displayName: input.user.displayName,
      role: input.user.role,
      iss: input.issuer,
      aud: 'handrix-internal',
      iat: issuedAtSeconds,
      exp: expiresAtSeconds,
    } satisfies InternalJwtPayload),
  );
  const signatureSegment = signSegment(
    `${headerSegment}.${payloadSegment}`,
    input.secret,
  );

  return {
    token: `${headerSegment}.${payloadSegment}.${signatureSegment}`,
    issuedAt: new Date(issuedAtSeconds * 1000).toISOString(),
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
  };
}

export function validateInternalAccessToken(input: {
  token: string;
  secret: string;
  issuer: string;
  now?: Date;
}): AuthenticatedInternalUser {
  const payload = parsePayload(input.token, input.secret);
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);

  if (payload.iss !== input.issuer || payload.exp <= nowSeconds) {
    throw new Error('Invalid internal access token.');
  }

  return {
    id: payload.sub,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
  };
}
