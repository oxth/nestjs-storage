import type { ExecutionContext } from '@nestjs/common';

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
import type { Request } from 'express';
import { LocalSignedUrlGuard } from './local-signed-url.guard';
import { StorageService } from 'src/storage.service';

describe('LocalSignedUrlGuard (crypto verification throws)', () => {
  it('throws ForbiddenException("Invalid signature") when verification throws', () => {
    const storageService = {
      getSignSecret: vi.fn().mockReturnValue('secret'),
    } as unknown as StorageService;
    const guard = new LocalSignedUrlGuard(storageService);

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

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(ctx)).toThrow('Invalid signature');
  });
});
