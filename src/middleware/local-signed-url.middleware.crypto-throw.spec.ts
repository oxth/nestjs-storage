import type { NextFunction, Request, Response } from 'express';

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
import { LocalSignedUrlMiddleware } from './local-signed-url.middleware';
import { StorageService } from 'src/storage.service';

describe('LocalSignedUrlMiddleware (crypto verification throws)', () => {
  it('returns 403 Invalid signature when the verification step throws', () => {
    const storageService = {
      getSignSecret: vi.fn().mockReturnValue('secret'),
    } as unknown as StorageService;
    const middleware = new LocalSignedUrlMiddleware(storageService);

    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const signature = createHmac('sha256', 'secret')
      .update(`/files/a.png:${expiresAt}`)
      .digest('hex');

    const req = {
      query: { expires: String(expiresAt), signature },
      originalUrl: '/files/a.png',
      protocol: 'https',
      host: 'example.com',
    } as unknown as Request;

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next: NextFunction = vi.fn();

    middleware.use(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid signature' });
    expect(next).not.toHaveBeenCalled();
  });
});
