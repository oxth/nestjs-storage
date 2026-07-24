import { createHmac } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { LocalSignedUrlGuard } from './local-signed-url.guard';
import { StorageService } from 'src/storage.service';

function buildStorageService(signSecret?: string): StorageService {
  return {
    getSignSecret: vi.fn().mockReturnValue(signSecret),
  } as unknown as StorageService;
}

function buildContext(
  query: Record<string, string | undefined>,
  originalUrl = '/files/a.png',
): ExecutionContext {
  const req = {
    query,
    originalUrl,
    protocol: 'https',
    host: 'example.com',
  } as unknown as Request;

  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

function sign(pathname: string, expiresAt: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${pathname}:${expiresAt}`)
    .digest('hex');
}

describe('LocalSignedUrlGuard', () => {
  it('allows the request immediately when no signSecret is configured', () => {
    const guard = new LocalSignedUrlGuard(buildStorageService());

    expect(guard.canActivate(buildContext({}))).toBe(true);
  });

  it('throws ForbiddenException with the rejection reason when verification fails', () => {
    const guard = new LocalSignedUrlGuard(buildStorageService('secret'));

    expect(() => guard.canActivate(buildContext({ expires: '123' }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(buildContext({ expires: '123' }))).toThrow(
      'Missing signature parameters',
    );
  });

  it('returns true when the signature is valid', () => {
    const guard = new LocalSignedUrlGuard(buildStorageService('secret'));
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const signature = sign('/files/a.png', expiresAt, 'secret');

    expect(
      guard.canActivate(
        buildContext({ expires: String(expiresAt), signature }),
      ),
    ).toBe(true);
  });
});
