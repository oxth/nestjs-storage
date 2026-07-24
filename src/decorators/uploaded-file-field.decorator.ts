import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { StoredFile } from 'src/interfaces/stored-file';

export const UploadedFileFields = createParamDecorator(
  (fieldName: string, ctx: ExecutionContext): StoredFile | StoredFile[] => {
    const request = ctx.switchToHttp().getRequest<Express.Request>();
    return request.files?.[fieldName];
  },
);
