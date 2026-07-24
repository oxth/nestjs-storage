import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { UploadedFileFields } from './uploaded-file-field.decorator';
import { StoredFile } from 'src/interfaces/stored-file';

class TestController {
  handler(@UploadedFileFields('avatar') _file: StoredFile | StoredFile[]) {}
}

function getFactory(): (
  data: string,
  ctx: ExecutionContext,
) => StoredFile | StoredFile[] | undefined {
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'handler',
  ) as Record<
    string,
    { factory: (data: string, ctx: ExecutionContext) => unknown }
  >;
  const [entry] = Object.values(metadata);
  return entry.factory as (
    data: string,
    ctx: ExecutionContext,
  ) => StoredFile | StoredFile[] | undefined;
}

function buildContext(request: Partial<Express.Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('UploadedFileFields', () => {
  it('extracts the stored file for the given field name', () => {
    const storedFile: StoredFile = {
      disk: 'local',
      path: 'avatars/a.png',
      size: 10,
      mimetype: 'image/png',
      originalName: 'a.png',
    };
    const factory = getFactory();

    const result = factory(
      'avatar',
      buildContext({ files: { avatar: storedFile } } as any),
    );

    expect(result).toBe(storedFile);
  });

  it('returns undefined when files is not present on the request', () => {
    const factory = getFactory();

    const result = factory('avatar', buildContext({}));

    expect(result).toBeUndefined();
  });

  it('returns undefined when the field name is missing from files', () => {
    const factory = getFactory();

    const result = factory('avatar', buildContext({ files: {} }));

    expect(result).toBeUndefined();
  });
});
