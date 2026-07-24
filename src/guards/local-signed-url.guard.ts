import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { StorageService } from 'src/storage.service';

@Injectable()
export class LocalSignedUrlGuard implements CanActivate {
  constructor(
    @Inject(StorageService)
    private readonly storageService: StorageService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const signSecret = this.storageService.getSignSecret();
    if (!signSecret) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const { expires, signature } = req.query as Record<
      string,
      string | undefined
    >;

    if (!expires || !signature) {
      throw new ForbiddenException('Missing signature parameters');
    }

    const expiresAt = Number.parseInt(expires, 10);
    if (Number.isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      throw new ForbiddenException('URL has expired');
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

    if (!isValid) {
      throw new ForbiddenException('Invalid signature');
    }

    return true;
  }
}
