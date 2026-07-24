import { createHmac } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { LocalSignedUrlMiddleware } from './local-signed-url.middleware';
import { StorageService } from 'src/storage.service';

function buildStorageService(signSecret?: string): StorageService {
  return {
    getSignSecret: vi.fn().mockReturnValue(signSecret),
  } as unknown as StorageService;
}

function buildReqRes(
  query: Record<string, string | undefined>,
  originalUrl = '/files/a.png',
) {
  const req = {
    query,
    originalUrl,
    protocol: 'https',
    host: 'example.com',
  } as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next: NextFunction = vi.fn();

  return { req, res, next, status, json };
}

function sign(pathname: string, expiresAt: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${pathname}:${expiresAt}`)
    .digest('hex');
}

describe('LocalSignedUrlMiddleware', () => {
  it('calls next() immediately when no signSecret is configured', () => {
    const middleware = new LocalSignedUrlMiddleware(buildStorageService());
    const { req, res, next, status } = buildReqRes({});

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('returns 403 with the rejection reason when verification fails', () => {
    const middleware = new LocalSignedUrlMiddleware(
      buildStorageService('secret'),
    );
    const { req, res, next, status, json } = buildReqRes({ expires: '123' });

    middleware.use(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      message: 'Missing signature parameters',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the signature is valid', () => {
    const middleware = new LocalSignedUrlMiddleware(
      buildStorageService('secret'),
    );
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const signature = sign('/files/a.png', expiresAt, 'secret');
    const { req, res, next, status } = buildReqRes({
      expires: String(expiresAt),
      signature,
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });
});
