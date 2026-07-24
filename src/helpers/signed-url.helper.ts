import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export type SignedUrlRejectionReason =
  'Missing signature parameters' | 'URL has expired' | 'Invalid signature';

export type SignedUrlVerificationResult =
  { valid: true } | { valid: false; reason: SignedUrlRejectionReason };

export function verifySignedUrl(
  req: Pick<Request, 'query' | 'originalUrl' | 'protocol' | 'host'>,
  signSecret: string,
): SignedUrlVerificationResult {
  const { expires, signature } = req.query as Record<
    string,
    string | undefined
  >;

  if (!expires || !signature) {
    return { valid: false, reason: 'Missing signature parameters' };
  }

  const expiresAt = Number.parseInt(expires, 10);
  if (Number.isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
    return { valid: false, reason: 'URL has expired' };
  }

  const url = new URL(req.originalUrl, `${req.protocol}://${req.host}`);
  const payload = `${url.pathname}:${expiresAt}`;
  const expected = createHmac('sha256', signSecret)
    .update(payload)
    .digest('hex');

  let isValid: boolean;
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');

    isValid =
      expectedBuf.length === providedBuf.length &&
      timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    isValid = false;
  }

  return isValid
    ? { valid: true }
    : { valid: false, reason: 'Invalid signature' };
}
