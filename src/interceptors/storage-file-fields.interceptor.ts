import type { Request, Response } from 'express';

import multer from 'multer';
import { Observable } from 'rxjs';
import {
  CallHandler,
  ExecutionContext,
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

interface StoredFileFields {
  [key: string]: StoredFile;
}

export function StorageFileFieldsInterceptor(
  fieldNames: string[],
  options: StorageFileInterceptorOptions = {},
): Type<NestInterceptor> {
  /* v8 ignore start -- @Injectable() with no param/method decorators never takes the decorator helper's `kind` branch */
  @Injectable()
  /* v8 ignore stop */
  class MixinInterceptor implements NestInterceptor {
    protected multer: multer.Multer;

    constructor(private readonly storageService: StorageService) {
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
      if (!req.files) {
        return next.handle();
      }

      const diskName = options.disk ?? this.storageService.getDefaultDisk();
      const disk = this.storageService.disk(diskName);
      const strategy =
        options.namingStrategy ??
        this.storageService.getNamingStrategy(diskName);

      const storedFileFields: StoredFileFields = {};
      for (const [key, files] of Object.entries(req.files)) {
        if ((files as Express.Multer.File[]).length === 0) {
          continue;
        }

        for (const file of files as Express.Multer.File[]) {
          const storedPath = await generateFileName(
            strategy,
            file,
            options.path,
          );
          await disk.put(storedPath, file.buffer);

          storedFileFields[key] = {
            disk: diskName,
            path: storedPath,
            mimetype: file.mimetype,
            size: file.size,
            originalName: file.originalname,
          };
        }
      }

      req.files = storedFileFields as unknown as Record<
        string,
        Express.Multer.File[]
      >;
      return next.handle();
    }

    private runMulter(req: Request, res: Response): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        this.multer.fields(
          fieldNames.map((field) => ({ name: field, maxCount: 1 })),
        )(req, res, (err: any) => {
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
