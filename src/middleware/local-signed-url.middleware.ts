import { Injectable, NestMiddleware } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { StorageService } from 'src/storage.service';

@Injectable()
export class LocalSignedUrlMiddleware implements NestMiddleware {
  constructor(private readonly storageService: StorageService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const signSecret = this.storageService.getSignSecret();
    if (!signSecret) {
      next();
      return;
    }

    const { expires, signature } = req.query as Record<
      string,
      string | undefined
    >;

    if (!expires || !signature) {
      res.status(403).json({ message: 'Missing signature parameters' });
      return;
    }

    const expiresAt = Number.parseInt(expires, 10);
    if (Number.isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      res.status(403).json({ message: 'URL has expired' });
      return;
    }

    const url = new URL(req.originalUrl, `${req.protocol}://${req.host}`);

    const payload = `${url.pathname}:${expiresAt}`;
    const expected = createHmac('sha256', signSecret)
      .update(payload)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const providedBuf = Buffer.from(signature, 'hex');

      if (
        expectedBuf.length !== providedBuf.length ||
        !timingSafeEqual(expectedBuf, providedBuf)
      ) {
        res.status(403).json({ message: 'Invalid signature' });
        return;
      }
    } catch {
      res.status(403).json({ message: 'Invalid signature' });
      return;
    }

    next();
  }
}
