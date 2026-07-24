import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import { verifySignedUrl } from './signed-url.helper';

function buildRequest(
  query: Record<string, string | undefined>,
  originalUrl = '/files/a.png',
): Pick<Request, 'query' | 'originalUrl' | 'protocol' | 'host'> {
  return {
    query,
    originalUrl,
    protocol: 'https',
    host: 'example.com',
  } as unknown as Pick<Request, 'query' | 'originalUrl' | 'protocol' | 'host'>;
}

function sign(pathname: string, expiresAt: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${pathname}:${expiresAt}`)
    .digest('hex');
}

describe('verifySignedUrl', () => {
  it('rejects when expires or signature query params are missing', () => {
    expect(verifySignedUrl(buildRequest({ expires: '123' }), 'secret')).toEqual(
      { valid: false, reason: 'Missing signature parameters' },
    );
    expect(
      verifySignedUrl(buildRequest({ signature: 'abc' }), 'secret'),
    ).toEqual({ valid: false, reason: 'Missing signature parameters' });
  });

  it('rejects when expires is not a valid number', () => {
    const result = verifySignedUrl(
      buildRequest({ expires: 'not-a-number', signature: 'abc' }),
      'secret',
    );
    expect(result).toEqual({ valid: false, reason: 'URL has expired' });
  });

  it('rejects when the URL has expired', () => {
    const expiresAt = Math.floor(Date.now() / 1000) - 10;
    const result = verifySignedUrl(
      buildRequest({ expires: String(expiresAt), signature: 'abc' }),
      'secret',
    );
    expect(result).toEqual({ valid: false, reason: 'URL has expired' });
  });

  it('rejects when the signature is not valid hex', () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const result = verifySignedUrl(
      buildRequest({
        expires: String(expiresAt),
        signature: 'zz-not-hex-zz',
      }),
      'secret',
    );
    expect(result).toEqual({ valid: false, reason: 'Invalid signature' });
  });

  it('rejects when the signature does not match', () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const wrongSignature = sign('/files/a.png', expiresAt, 'wrong-secret');
    const result = verifySignedUrl(
      buildRequest({ expires: String(expiresAt), signature: wrongSignature }),
      'secret',
    );
    expect(result).toEqual({ valid: false, reason: 'Invalid signature' });
  });

  it('accepts a valid signature', () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const signature = sign('/files/a.png', expiresAt, 'secret');
    const result = verifySignedUrl(
      buildRequest({ expires: String(expiresAt), signature }),
      'secret',
    );
    expect(result).toEqual({ valid: true });
  });
});
