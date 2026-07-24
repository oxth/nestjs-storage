import type { Request, Response } from 'express';
import type { ExecutionContext } from '@nestjs/common';
import multer from 'multer';
import { StorageFileInterceptor } from './storage-file.interceptor';
import { StorageService } from 'src/storage.service';
import { UuidNamingStrategy } from 'src/strategies';

const singleMock = vi.fn();

vi.mock('multer', () => {
  const multerFn: any = vi.fn(() => ({
    single: singleMock,
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

describe('StorageFileInterceptor', () => {
  beforeEach(() => {
    singleMock.mockReset();
  });

  it('configures multer with memory storage, the field name, and the given limits/fileFilter', () => {
    const fileFilter = vi.fn();
    const limits = { fileSize: 1024 };
    const InterceptorClass = StorageFileInterceptor('avatar', {
      fileFilter,
      limits,
    });
    const { service } = buildStorageService();

    new InterceptorClass(service as any);

    expect(multer).toHaveBeenCalledWith({
      storage: 'memory-storage',
      fileFilter,
      limits,
    });
  });

  it('skips storage and calls next.handle() when no file is uploaded', async () => {
    singleMock.mockReturnValue((_req: Request, _res: Response, cb: any) =>
      cb(),
    );
    const InterceptorClass = StorageFileInterceptor('avatar');
    const { service, disk } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    const handleResult = Symbol('next');
    const callHandler = { handle: vi.fn().mockReturnValue(handleResult) };

    const result = await interceptor.intercept(ctx, callHandler as any);

    expect(req.file).toBeUndefined();
    expect(disk).not.toHaveBeenCalled();
    expect(result).toBe(handleResult);
  });

  it('rejects when multer reports an error', async () => {
    const error = new Error('boom');
    singleMock.mockReturnValue((_req: Request, _res: Response, cb: any) =>
      cb(error),
    );
    const InterceptorClass = StorageFileInterceptor('avatar');
    const { service } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx } = buildContext({});
    const callHandler = { handle: vi.fn() };

    await expect(
      interceptor.intercept(ctx, callHandler as any),
    ).rejects.toThrow('boom');
  });

  it('stores the uploaded file on the default disk using the default naming strategy', async () => {
    const file = {
      buffer: Buffer.from('data'),
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 4,
    };
    singleMock.mockReturnValue((req: any, _res: Response, cb: any) => {
      req.file = file;
      cb();
    });

    const InterceptorClass = StorageFileInterceptor('avatar');
    const { service, disk, put } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    const handleResult = Symbol('next');
    const callHandler = { handle: vi.fn().mockReturnValue(handleResult) };

    const result = await interceptor.intercept(ctx, callHandler as any);

    expect(disk).toHaveBeenCalledWith('local');
    expect(put).toHaveBeenCalledWith(expect.any(String), file.buffer);
    expect(req.file).toMatchObject({
      disk: 'local',
      mimetype: 'image/png',
      size: 4,
      originalName: 'photo.png',
    });
    expect((req.file as any).path).toMatch(/\.png$/);
    expect(result).toBe(handleResult);
  });

  it('honors the disk, path, and namingStrategy options', async () => {
    const file = {
      buffer: Buffer.from('data'),
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 4,
    };
    singleMock.mockReturnValue((req: any, _res: Response, cb: any) => {
      req.file = file;
      cb();
    });

    const customStrategy = vi.fn().mockReturnValue('custom-name.png');
    const InterceptorClass = StorageFileInterceptor('avatar', {
      disk: 's3',
      path: 'avatars',
      namingStrategy: customStrategy,
    });
    const { service, disk, put } = buildStorageService();
    const interceptor = new InterceptorClass(service as any);

    const { ctx, req } = buildContext({});
    await interceptor.intercept(ctx, { handle: vi.fn() } as any);

    expect(disk).toHaveBeenCalledWith('s3');
    expect(customStrategy).toHaveBeenCalledWith(file.buffer, 'photo.png');
    expect(put).toHaveBeenCalledWith('avatars/custom-name.png', file.buffer);
    expect((req.file as any).disk).toBe('s3');
    expect((req.file as any).path).toBe('avatars/custom-name.png');
  });
});
