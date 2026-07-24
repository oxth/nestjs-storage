import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { verifySignedUrl } from 'src/helpers';
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
    const result = verifySignedUrl(req, signSecret);
    if (!result.valid) {
      throw new ForbiddenException(result.reason);
    }

    return true;
  }
}
