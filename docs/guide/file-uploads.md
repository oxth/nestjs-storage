# File Uploads

Four interceptor factories cover the common upload shapes. Each accepts an options object: `{ disk?, path?, namingStrategy?, fileFilter?, limits? }`.

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
  originalName: string;
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
});
```

On a Multer error (file too large, too many files, ...), the promise rejects with a Nest `PayloadTooLargeException`/`BadRequestException` where recognized, or the original error otherwise.
