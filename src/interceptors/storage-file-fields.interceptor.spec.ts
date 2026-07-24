import type { Request, Response } from 'express';
import type { ExecutionContext } from '@nestjs/common';
import multer from 'multer';
import { StorageFileFieldsInterceptor } from './storage-file-fields.interceptor';
import { StorageService } from 'src/storage.service';
import { UuidNamingStrategy } from 'src/strategies';

const fieldsMock = vi.fn();

vi.mock('multer', () => {
  const multerFn: any = vi.fn(() => ({
    fields: fieldsMock,
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

describe('StorageFileFieldsInterceptor', () => {
  beforeEach(() => {
    fieldsMock.mockReset();
  });

  it('configures multer fields with maxCount 1 per field name', () => {
    const InterceptorClass = StorageFileFieldsInterceptor(['avatar', 'cover']);
    const { service } = buildStorageService();
    new InterceptorClass(service as any);

    expect(multer).toHaveBeenCalledWith({
      storage: 'memory-storage',
      fileFilter: undefined,
      limits: undefined,
    });
  });

  it('calls next.handle() without touching storage when req.files is absent', async () => {
    fieldsMock.mockReturnValue((_req: Request, _res: Response, cb: any) =>
      cb(),
    );
    const InterceptorClass = StorageFileFieldsInterceptor(['avatar']);
    const { service, disk } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    const handleResult = Symbol('next');
    const result = await interceptor.intercept(ctx, {
      handle: vi.fn().mockReturnValue(handleResult),
    } as any);

    expect(req.files).toBeUndefined();
    expect(disk).not.toHaveBeenCalled();
    expect(result).toBe(handleResult);
  });

  it('rejects when multer reports an error', async () => {
    const error = new Error('boom');
    fieldsMock.mockReturnValue((_req: Request, _res: Response, cb: any) =>
      cb(error),
    );
    const InterceptorClass = StorageFileFieldsInterceptor(['avatar']);
    const { service } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx } = buildContext({});

    await expect(
      interceptor.intercept(ctx, { handle: vi.fn() } as any),
    ).rejects.toThrow('boom');
  });

  it('skips fields with an empty file array and stores the rest', async () => {
    const avatarFile = {
      buffer: Buffer.from('a'),
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1,
    };
    fieldsMock.mockReturnValue((req: any, _res: Response, cb: any) => {
      req.files = {
        avatar: [avatarFile],
        cover: [],
      };
      cb();
    });

    const InterceptorClass = StorageFileFieldsInterceptor(['avatar', 'cover'], {
      disk: 's3',
      path: 'profiles',
    });
    const { service, disk, put } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    await interceptor.intercept(ctx, { handle: vi.fn() } as any);

    expect(put).toHaveBeenCalledTimes(1);
    expect(disk).toHaveBeenCalledWith('s3');
    const storedFiles = req.files as any;
    expect(storedFiles.avatar).toMatchObject({
      disk: 's3',
      originalName: 'avatar.png',
    });
    expect(storedFiles.cover).toBeUndefined();
  });

  it('falls back to the default disk and naming strategy when no options are given', async () => {
    const avatarFile = {
      buffer: Buffer.from('a'),
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1,
    };
    fieldsMock.mockReturnValue((req: any, _res: Response, cb: any) => {
      req.files = { avatar: [avatarFile] };
      cb();
    });

    const InterceptorClass = StorageFileFieldsInterceptor(['avatar']);
    const { service, disk } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    await interceptor.intercept(ctx, { handle: vi.fn() } as any);

    expect(disk).toHaveBeenCalledWith('local');
    expect((req.files as any).avatar.disk).toBe('local');
  });
});
