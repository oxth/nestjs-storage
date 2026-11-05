---
description: 'Stream NestJS file uploads straight to S3, R2, GCS, Azure or local disk with Multer-based interceptors, per-upload options and file validation.'
---

# File Uploads

Four interceptor factories cover the common upload shapes. Each accepts an options object: `{ disk?, path?, namingStrategy?, fileFilter?, limits?, removeOnError? }`.

| Interceptor | Multer equivalent | Where the result ends up |
| --- | --- | --- |
| `StorageFileInterceptor(field, options?)` | `.single(field)` | `req.file` |
| `StorageFilesInterceptor(field, maxCount?, options?)` | `.array(field, maxCount)` | `req.files` (array) |
| `StorageFileFieldsInterceptor(fields, options?)` | `.fields([{ name, maxCount: 1 }, ...])` | `req.files` (map, one file per field) |
| `StorageFilesFieldsInterceptor(fields, maxCount?, options?)` | `.fields([{ name, maxCount }, ...])` | `req.files` (map of arrays) |

Each stored file is uploaded straight to disk and replaced on the request with a plain `StoredFile` object — no buffer kept in memory afterwards:

```ts
interface StoredFile {
  disk: string; // disk it was stored on
  path: string; // key/path in that disk
  size: number;
  mimetype: string;
  originalname: string;
}
```

## Single file

```ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { StorageFileInterceptor, StoredFile } from '@oxth/nestjs-storage';

@Controller('avatars')
export class AvatarsController {
  @Post()
  @UseInterceptors(StorageFileInterceptor('avatar'))
  upload(@UploadedFile() avatar: StoredFile) {
    return avatar;
  }
}
```

## Multiple files (one field)

```ts
import { UploadedFiles } from '@nestjs/common';
import { StorageFilesInterceptor, StoredFile } from '@oxth/nestjs-storage';

@Post()
@UseInterceptors(StorageFilesInterceptor('photos', 10))
upload(@UploadedFiles() photos: StoredFile[]) {
  return photos;
}
```

## One file per named field

```ts
import {
  UploadedFileFields,
  StorageFileFieldsInterceptor,
} from '@oxth/nestjs-storage';

@Post()
@UseInterceptors(StorageFileFieldsInterceptor(['avatar', 'cover']))
upload(
  @UploadedFileFields('avatar') avatar: StoredFile,
  @UploadedFileFields('cover') cover: StoredFile,
) {
  return { avatar, cover };
}
```

## Multiple files per named field

```ts
import {
  StorageFilesFieldsInterceptor,
  StoredFile,
  UploadedFileFields,
} from '@oxth/nestjs-storage';

@Post()
@UseInterceptors(StorageFilesFieldsInterceptor(['photos', 'documents'], 5))
upload(@UploadedFileFields('photos') photos: StoredFile[]) {
  return photos;
}
```

## Per-upload options

```ts
StorageFileInterceptor('avatar', {
  disk: 's3', // override the default disk
  path: 'avatars', // key prefix
  namingStrategy: HashNamingStrategy,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
  removeOnError: true, // default: delete stored files if the request fails afterwards
});
```

On a Multer error (file too large, too many files, ...), the promise rejects with a Nest `PayloadTooLargeException`/`BadRequestException` where recognized, or the original error otherwise.

## File validation

`FileExtensionValidator` is a `@nestjs/common` `FileValidator` you can drop into `ParseFilePipe` to reject uploads by extension:

```ts
import { ParseFilePipe, UploadedFile } from '@nestjs/common';
import { FileExtensionValidator } from '@oxth/nestjs-storage';

@Post()
@UseInterceptors(StorageFileInterceptor('avatar'))
upload(
  @UploadedFile(
    new ParseFilePipe({
      validators: [new FileExtensionValidator({ allowedExtensions: ['.png', '.jpg', '.jpeg'] })],
    }),
  )
  avatar: StoredFile,
) {
  return avatar;
}
```

Extensions are matched case-insensitively against `path.extname(file.originalname)`; the leading dot is optional in `allowedExtensions`.

NestJS runs pipes *after* interceptors, so by the time `ParseFilePipe` runs, the file is already stored. If validation fails, or the route handler throws, the interceptor deletes the files it stored before the error response goes out (set `removeOnError: false` to keep them).

To reject a file before it's stored at all, and skip uploading it to your bucket, use the interceptor's `fileFilter` instead. Pass an error to the callback to respond with it:

```ts
import { BadRequestException } from '@nestjs/common';

@UseInterceptors(
  StorageFileInterceptor('avatar', {
    fileFilter: (req, file, cb) =>
      /\.(png|jpe?g)$/i.test(file.originalname)
        ? cb(null, true)
        : cb(new BadRequestException('Only .png and .jpg files are allowed'), false),
  }),
)
```
