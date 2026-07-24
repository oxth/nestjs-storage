import type { Request } from 'express';

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    timingSafeEqual: vi.fn(() => {
      throw new Error('boom');
    }),
  };
});

import { createHmac } from 'node:crypto';
import { verifySignedUrl } from './signed-url.helper';

describe('verifySignedUrl (crypto verification throws)', () => {
  it('rejects with "Invalid signature" when verification throws', () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const signature = createHmac('sha256', 'secret')
      .update(`/files/a.png:${expiresAt}`)
      .digest('hex');

    const req = {
      query: { expires: String(expiresAt), signature },
      originalUrl: '/files/a.png',
      protocol: 'https',
      host: 'example.com',
    } as unknown as Pick<
      Request,
      'query' | 'originalUrl' | 'protocol' | 'host'
    >;

    expect(verifySignedUrl(req, 'secret')).toEqual({
      valid: false,
      reason: 'Invalid signature',
    });
  });
});
