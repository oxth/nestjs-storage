# @oxth/nestjs-storage

A NestJS storage module with a single, unified API for Local filesystem, S3, Cloudflare R2, Google Cloud Storage, Azure Blob Storage, and any S3-compatible service (MinIO, Backblaze B2, DigitalOcean Spaces, Wasabi, ...). Built on top of [flydrive](https://flydrive.dev/).

**[Full documentation site](https://oxth.github.io/nestjs-storage/)**

- One `StorageService` API regardless of which disk(s) you configure
- Multiple named disks in the same app, with a configurable default
- Multer-based upload interceptors that stream files straight to a disk
- Pluggable file naming strategies (UUID, hash, original name, date path)
- Signed URLs for the local disk, enforced via a `Guard` or a `Middleware`
- A built-in fake disk for tests, backed by the real filesystem

> Pointing an AI coding assistant at this package? [`llm.md`](./llm.md) is a condensed API reference and [`llm-full.md`](./llm-full.md) is the exhaustive one — both are more token-efficient than this README for that purpose.

## Installation

```bash
npm install @oxth/nestjs-storage
```

`@nestjs/common` is a peer dependency — install whatever version your app already uses (`^10` or `^11`).

`flydrive` is a regular dependency (it's the storage engine behind every driver, including `local`). The SDKs for the other drivers are optional peer dependencies — only install the ones for the disks you actually configure:

```bash
# only if you configure an s3 or r2 disk
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# only if you configure a gcs disk
npm install @google-cloud/storage

# only if you configure an azure disk
npm install @azure/storage-blob

# only if you use CloudFront signed URLs on an s3 disk
npm install @aws-sdk/cloudfront-signer
```

If you only use the `local` disk, you don't need to install any of these — the package never even attempts to load them.

## Quick start

```ts
import { Module } from '@nestjs/common';
import { StorageModule } from '@oxth/nestjs-storage';

@Module({
  imports: [
    StorageModule.forRoot({
      default: 'local',
      disks: {
        local: {
          driver: 'local',
          config: {
            location: './storage',
            url: 'http://localhost:3000/files',
          },
        },
      },
    }),
  ],
})
export class AppModule {}
```

`StorageModule` is `@Global()`, so `StorageService` is available for injection anywhere in your app once it's imported in your root module.

```ts
import { Injectable } from '@nestjs/common';
import { StorageService } from '@oxth/nestjs-storage';

@Injectable()
export class AvatarsService {
  constructor(private readonly storage: StorageService) {}

  async save(key: string, contents: Buffer) {
    await this.storage.put(key, contents);
    return this.storage.getUrl(key);
  }
}
```

## Async configuration

Use `forRootAsync` when your disk config depends on other providers (e.g. a `ConfigService`):

```ts
StorageModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    default: 's3',
    disks: {
      s3: {
        driver: 's3',
        config: {
          bucket: config.get('S3_BUCKET'),
          region: config.get('S3_REGION'),
          credentials: {
            accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
          },
        },
      },
    },
  }),
});
```

You can also provide a class implementing `StorageOptionsFactory`:

```ts
@Injectable()
class StorageConfigService implements StorageOptionsFactory {
  createStorageOptions(): StorageModuleOptions {
    return {
      /* ... */
    };
  }
}

StorageModule.forRootAsync({ useClass: StorageConfigService });
```

## Disks and drivers

Every entry under `disks` has a `driver` name and a driver-specific `config`. The built-in drivers are:

| Driver  | `config` shape                               | Notes                                                              |
| ------- | --------------------------------------------- | ------------------------------------------------------------------- |
| `local` | `{ location, url?, visibility?, ... }`         | Reads/writes to the local filesystem.                                |
| `s3`    | `{ bucket, region, credentials, cdn?, ... }`    | Also covers MinIO, B2, DigitalOcean Spaces, Wasabi via `endpoint`.    |
| `r2`    | `{ bucket, endpoint, credentials, region? }`    | Cloudflare R2 — same as `s3` with the right defaults baked in.        |
| `gcs`   | `{ bucket, ... }`                               | Google Cloud Storage.                                                 |
| `azure` | `{ containerName, accountName, accountKey }` or `{ containerName, connectionString }` | Azure Blob Storage. |

### Local

```ts
disks: {
  local: {
    driver: 'local',
    config: {
      location: './storage',              // absolute or relative root folder
      url: 'http://localhost:3000/files',  // used to build public URLs
      visibility: 'private',               // default; 'public' also supported
    },
  },
},
```

Signed/temporary URLs for the local disk require a top-level `signSecret` (see [Signed URLs](#signed-urls-for-the-local-disk) below):

```ts
StorageModule.forRoot({
  signSecret: process.env.STORAGE_SIGN_SECRET,
  default: 'local',
  disks: { local: { driver: 'local', config: { location: './storage' } } },
});
```

Without `signSecret`, `getSignedUrl()` on the local disk logs a warning and falls back to an unsigned URL — fine for local development, not for production.

### S3 (and S3-compatible services)

```ts
disks: {
  s3: {
    driver: 's3',
    config: {
      bucket: 'my-bucket',
      region: 'us-east-1',
      credentials: { accessKeyId: '...', secretAccessKey: '...' },
    },
  },
},
```

MinIO, Backblaze B2, DigitalOcean Spaces, and Wasabi are all S3-API compatible — configure them the same way, pointing `endpoint` at that provider and, if required, setting `supportsACL: false`.

**CloudFront signed URLs**: pass a `cdn` block and set `cdnUrl` to the CloudFront distribution URL:

```ts
config: {
  bucket: 'my-bucket',
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' },
  cdnUrl: 'https://cdn.example.com',
  cdn: {
    provider: 'cloudfront',
    signingKeyId: process.env.CLOUDFRONT_KEY_PAIR_ID,
    signingKey: process.env.CLOUDFRONT_PRIVATE_KEY,
  },
},
```

With this configured, `storage.getSignedUrl(key)` transparently signs through CloudFront instead of S3 (requires `@aws-sdk/cloudfront-signer`, see [Installation](#installation)).

### R2

```ts
disks: {
  r2: {
    driver: 'r2',
    config: {
      bucket: 'my-bucket',
      endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
      credentials: { accessKeyId: '...', secretAccessKey: '...' },
    },
  },
},
```

`region` defaults to `'auto'` and ACL support is disabled automatically, matching R2's requirements.

### GCS

```ts
disks: {
  gcs: {
    driver: 'gcs',
    config: { bucket: 'my-bucket' },
  },
},
```

### Azure

```ts
disks: {
  azure: {
    driver: 'azure',
    config: {
      containerName: 'my-container',
      accountName: 'mystorageaccount',
      accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
      // or, instead of accountName/accountKey:
      // connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    },
  },
},
```

`getSignedUrl`/`getSignedUploadUrl` generate a SAS token and require `accountName`/`accountKey` — a `connectionString` alone can construct the client but can't sign a SAS, and calling either of those methods without shared-key credentials rejects with a clear error. `getVisibility`/`setVisibility` are a no-op pass-through/read of the configured `visibility` (Azure has no per-blob ACL; visibility is a container-level setting). Optionally set `cdnUrl` to serve public URLs through a CDN/custom domain instead of the storage account's own endpoint.

### Multiple disks

Configure as many disks as you need and pick one per call:

```ts
StorageModule.forRoot({
  default: 'local',
  disks: {
    local: { driver: 'local', config: { location: './storage' } },
    s3: {
      driver: 's3',
      config: {
        bucket: 'backups',
        region: 'us-east-1',
        credentials: { accessKeyId: '...', secretAccessKey: '...' },
      },
    },
  },
});

await storage.disk('s3').put('backup.zip', buffer);
await storage.disk().put('avatar.png', buffer); // uses the default disk
```

### Custom drivers

Register your own driver factory under `drivers`, then reference it by name from a disk:

```ts
StorageModule.forRoot({
  default: 'ftp',
  disks: {
    ftp: { driver: 'ftp', config: { /* your own shape */ } },
  },
  drivers: [{ name: 'ftp', driver: (config) => new MyFtpDriver(config) }],
});
```

A driver factory just needs to return an object implementing flydrive's `DriverContract`.

## StorageService API

`StorageService` mirrors flydrive's `Disk` API. Every method operates on the default disk unless you call `.disk(name)` first.

> `StorageModule` handles this for you, but if you ever construct `StorageService` directly (e.g. outside of Nest DI, in a script) call `await service.init()` once before using it — that's the step that lazily resolves the driver(s) your config actually needs.

| Method | Description |
| --- | --- |
| `disk(name?)` | Get the underlying flydrive `Disk` for a given (or default) disk. |
| `file(key)` / `fromSnapshot(snapshot)` | Get a lazy `DriveFile` pointer, optionally rehydrated from a persisted snapshot. |
| `exists(key)` | Whether a file exists. |
| `get(key)` / `getBytes(key)` / `getStream(key)` | Read contents as a string, `Uint8Array`, or `Readable`. |
| `getMetaData(key)` | Content length, content type, etag, last modified. |
| `getVisibility(key)` / `setVisibility(key, visibility)` | Read/update `'public'` \| `'private'`. |
| `getUrl(key)` | Public URL for the file. |
| `getSignedUrl(key, options?)` | Temporary signed URL (download). |
| `getSignedUploadUrl(key, options?)` | Temporary signed URL for direct upload. |
| `put(key, contents, options?)` / `putStream(key, contents, options?)` | Write a file from a string/buffer or a stream. |
| `copy(src, dest, options?)` / `move(src, dest, options?)` | Copy/move within the same disk. |
| `copyFromFs(fsPath, dest, options?)` / `moveFromFs(fsPath, dest, options?)` | Import a file from the local filesystem into any disk. |
| `delete(key)` / `deleteAll(prefix?)` | Delete one file, or everything under a prefix. |
| `listAll(prefix?, options?)` | Paginated listing of files and directories. |
| `getDefaultDisk()` / `getSignSecret()` / `getNamingStrategy(diskName?)` | Read back the resolved configuration. |
| `fake(diskName?)` / `restore(diskName?)` | Swap a disk for a fake one, see [Testing](#testing-with-a-fake-disk). |

## File uploads

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

### Single file

```ts
import { Controller, Post, UseInterceptors, Req } from '@nestjs/common';
import { StorageFileInterceptor } from '@oxth/nestjs-storage';
import type { Request } from 'express';

@Controller('avatars')
export class AvatarsController {
  @Post()
  @UseInterceptors(StorageFileInterceptor('avatar'))
  upload(@Req() req: Request) {
    return req.file; // StoredFile
  }
}
```

### Multiple files (one field)

```ts
@Post()
@UseInterceptors(StorageFilesInterceptor('photos', 10))
upload(@Req() req: Request) {
  return req.files; // StoredFile[]
}
```

### One file per named field

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

### Multiple files per named field

```ts
@Post()
@UseInterceptors(StorageFilesFieldsInterceptor(['photos', 'documents'], 5))
upload(@UploadedFileFields('photos') photos: StoredFile[]) {
  return photos;
}
```

### Per-upload options

```ts
StorageFileInterceptor('avatar', {
  disk: 's3', // override the default disk
  path: 'avatars', // key prefix
  namingStrategy: HashNamingStrategy,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});
```

## Naming strategies

A naming strategy decides the stored file name/key from the uploaded file's contents and original name:

```ts
type NamingStrategy = (
  file: Uint8Array,
  originalName: string,
) => string | Promise<string>;
```

Built in:

| Strategy | Produces |
| --- | --- |
| `UuidNamingStrategy` (default) | `<uuid-v7><ext>` |
| `OriginalNamingStrategy` | the original file name, unchanged |
| `HashNamingStrategy` | `<sha256-of-contents><ext>` — natural de-duplication |
| `DatePathNamingStrategy` | `<yyyy>/<mm>/<dd>/<original-name-without-ext><ext>` |
| `DatePathUuidNamingStrategy` | `<yyyy>/<mm>/<dd>/<uuid-v7><ext>` |

Set one per disk, or override it per upload:

```ts
disks: {
  local: {
    driver: 'local',
    config: { location: './storage' },
    namingStrategy: HashNamingStrategy,
  },
},
```

Or write your own — it's just a function.

## Signed URLs for the local disk

The `local` driver can hand out HMAC-signed, expiring URLs once `signSecret` is set on the module. Protect the route that serves those files with either the guard or the middleware — both share the same verification logic, so pick whichever fits your app:

```ts
// Guard: rejects with a NestJS ForbiddenException
@UseGuards(LocalSignedUrlGuard)
@Get('files/*path')
serve() {
  /* ... */
}
```

```ts
// Middleware: writes a plain { message } 403 response itself
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LocalSignedUrlMiddleware).forRoutes('files');
  }
}
```

Generate the signed URL from your app with `storage.getSignedUrl(key, { expiresIn: '10mins' })` — this appends `expires` and `signature` query parameters that the guard/middleware verify on the way in.

## Testing with a fake disk

`StorageService.fake(diskName?)` swaps a disk for a real-filesystem-backed fake (under a temp directory by default, or wherever you configure via `fakes.location`), so your tests never touch production storage:

```ts
const fake = storage.fake('local');

await yourService.uploadAvatar(file);

fake.assertExists('avatars/photo.png');
storage.restore('local'); // back to the real disk
```

While a disk is faked, every `StorageService` call for that disk name (`.put`, `.get`, `.disk('local')`, ...) transparently uses the fake instead — no code changes needed in the code under test.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local setup, testing conventions, and how to add a driver or naming strategy. See [CHANGELOG.md](./CHANGELOG.md) for release history.

## License

MIT
