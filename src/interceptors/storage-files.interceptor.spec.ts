import type { Request, Response } from 'express';
import type { ExecutionContext } from '@nestjs/common';
import multer from 'multer';
import { StorageFilesInterceptor } from './storage-files.interceptor';
import { StorageService } from 'src/storage.service';
import { UuidNamingStrategy } from 'src/strategies';

const arrayMock = vi.fn();

vi.mock('multer', () => {
  const multerFn: any = vi.fn(() => ({
    array: arrayMock,
  }));
  multerFn.memoryStorage = vi.fn().mockReturnValue('memory-storage');
  return { default: multerFn };
});

function buildContext(req: Partial<Request>): {
  ctx: ExecutionContext;
  req: Partial<Request>;
} {
  const res: Partial<Response> = {};
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

function buildStorageService(overrides: Partial<StorageService> = {}) {
  const put = vi.fn().mockResolvedValue(undefined);
  const disk = vi.fn().mockReturnValue({ put });
  const service = {
    getDefaultDisk: vi.fn().mockReturnValue('local'),
    disk,
    getNamingStrategy: vi.fn().mockReturnValue(UuidNamingStrategy),
    ...overrides,
  } as unknown as StorageService;
  return { service, disk, put };
}

describe('StorageFilesInterceptor', () => {
  beforeEach(() => {
    arrayMock.mockReset();
  });

  it('configures multer array upload with the default maxCount of 10', () => {
    const InterceptorClass = StorageFilesInterceptor('photos');
    const { service } = buildStorageService();

    new InterceptorClass(service as any);

    expect(multer).toHaveBeenCalledWith({
      storage: 'memory-storage',
      fileFilter: undefined,
      limits: undefined,
    });
  });

  it('sets req.files to an empty array and skips storage when nothing is uploaded', async () => {
    arrayMock.mockReturnValue((_req: Request, _res: Response, cb: any) => cb());
    const InterceptorClass = StorageFilesInterceptor('photos');
    const { service, disk } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    const handleResult = Symbol('next');
    const result = await interceptor.intercept(ctx, {
      handle: vi.fn().mockReturnValue(handleResult),
    } as any);

    expect(req.files).toEqual([]);
    expect(disk).not.toHaveBeenCalled();
    expect(result).toBe(handleResult);
  });

  it('treats an explicitly empty files array the same as no files', async () => {
    arrayMock.mockReturnValue((req: any, _res: Response, cb: any) => {
      req.files = [];
      cb();
    });
    const InterceptorClass = StorageFilesInterceptor('photos');
    const { service, disk } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    await interceptor.intercept(ctx, { handle: vi.fn() } as any);

    expect(req.files).toEqual([]);
    expect(disk).not.toHaveBeenCalled();
  });

  it('rejects when multer reports an error', async () => {
    const error = new Error('boom');
    arrayMock.mockReturnValue((_req: Request, _res: Response, cb: any) =>
      cb(error),
    );
    const InterceptorClass = StorageFilesInterceptor('photos');
    const { service } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx } = buildContext({});

    await expect(
      interceptor.intercept(ctx, { handle: vi.fn() } as any),
    ).rejects.toThrow('boom');
  });

  it('stores every uploaded file and replaces req.files with stored file metadata', async () => {
    const files = [
      {
        buffer: Buffer.from('a'),
        originalname: 'a.png',
        mimetype: 'image/png',
        size: 1,
      },
      {
        buffer: Buffer.from('b'),
        originalname: 'b.png',
        mimetype: 'image/png',
        size: 1,
      },
    ];
    arrayMock.mockReturnValue((req: any, _res: Response, cb: any) => {
      req.files = files;
      cb();
    });

    const InterceptorClass = StorageFilesInterceptor('photos', 5, {
      disk: 's3',
      path: 'gallery',
    });
    const { service, disk, put } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    await interceptor.intercept(ctx, { handle: vi.fn() } as any);

    expect(disk).toHaveBeenCalledWith('s3');
    expect(put).toHaveBeenCalledTimes(2);
    expect(req.files).toHaveLength(2);
    expect((req.files as any)[0]).toMatchObject({
      disk: 's3',
      originalName: 'a.png',
    });
    expect((req.files as any)[0].path).toMatch(/^gallery\//);
    expect(arrayMock).toHaveBeenCalledWith('photos', 5);
  });

  it('falls back to the default disk and naming strategy when no options are given', async () => {
    const file = {
      buffer: Buffer.from('a'),
      originalname: 'a.png',
      mimetype: 'image/png',
      size: 1,
    };
    arrayMock.mockReturnValue((req: any, _res: Response, cb: any) => {
      req.files = [file];
      cb();
    });

    const InterceptorClass = StorageFilesInterceptor('photos');
    const { service, disk } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    await interceptor.intercept(ctx, { handle: vi.fn() } as any);

    expect(disk).toHaveBeenCalledWith('local');
    expect((req.files as any)[0].disk).toBe('local');
  });
});
