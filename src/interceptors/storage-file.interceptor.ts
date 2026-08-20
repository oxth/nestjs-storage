import type { Request, Response } from 'express';

import multer from 'multer';
import { Observable } from 'rxjs';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  mixin,
  NestInterceptor,
} from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces';

import { StorageService } from 'src/storage.service';
import { StorageFileInterceptorOptions } from 'src/interfaces';
import { transformException } from '@nestjs/platform-express/multer/multer/multer.utils.js';
import { StoredFile } from 'src/interfaces/stored-file';
import { generateFileName } from 'src/helpers';

export function StorageFileInterceptor(
  fieldName: string,
  options: StorageFileInterceptorOptions = {},
): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    protected multer: multer.Multer;

    constructor(
      @Inject(StorageService)
      private readonly storageService: StorageService,
    ) {
      this.multer = multer({
        storage: multer.memoryStorage(),
        fileFilter: options.fileFilter,
        limits: options.limits,
      });
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<unknown>> {
      const ctx = context.switchToHttp();
      const req = ctx.getRequest<Request>();
      const res = ctx.getResponse<Response>();

      await this.runMulter(req, res);
      if (!req.file) return next.handle();

      const diskName = options.disk ?? this.storageService.getDefaultDisk();
      const disk = this.storageService.disk(diskName);
      const strategy =
        options.namingStrategy ??
        this.storageService.getNamingStrategy(diskName);

      const storedPath = await generateFileName(
        strategy,
        req.file,
        options.path,
      );
      await disk.put(storedPath, req.file.buffer);

      const storedFile: StoredFile = {
        disk: diskName,
        path: storedPath,
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname,
      };

      req.file = storedFile as unknown as Express.Multer.File;
      return next.handle();
    }

    private runMulter(req: Request, res: Response): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        this.multer.single(fieldName)(req, res, (err: any) => {
          if (err) {
            const error = transformException(err);
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return reject(error);
          }
          resolve();
        });
      });
    }
  }

  return mixin(MixinInterceptor);
}
