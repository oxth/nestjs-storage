import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { verifySignedUrl } from 'src/helpers';
import { StorageService } from 'src/storage.service';

@Injectable()
export class LocalSignedUrlMiddleware implements NestMiddleware {
  constructor(
    @Inject(StorageService)
    private readonly storageService: StorageService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const signSecret = this.storageService.getSignSecret();
    if (!signSecret) {
      next();
      return;
    }

    const result = verifySignedUrl(req, signSecret);
    if (!result.valid) {
      res.status(403).json({ message: result.reason });
      return;
    }

    next();
  }
}
