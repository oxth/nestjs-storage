# @oxth/nestjs-storage — quick reference

NestJS storage module. One `StorageService` API for Local filesystem, S3, Cloudflare R2, Google Cloud Storage, Azure Blob Storage, and any S3-compatible service (MinIO, B2, DigitalOcean Spaces, Wasabi — configure as `s3` with a custom `endpoint`). Built on [flydrive](https://flydrive.dev/).

For full type signatures and behavior detail, see `llm-full.md`.

## Install

```bash
npm install @oxth/nestjs-storage
```

`@nestjs/common` is a required peer dependency. `flydrive` is a regular dependency. `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (for `s3`/`r2` disks), `@google-cloud/storage` (for `gcs` disks), `@azure/storage-blob` (for `azure` disks), and `@aws-sdk/cloudfront-signer` (for CloudFront signed URLs) are **optional peer dependencies** — install only the ones matching the disk(s) you configure. A `local`-only app needs none of them.

## Register the module

```ts
import { StorageModule } from '@oxth/nestjs-storage';

StorageModule.forRoot({
  default: 'local',
  signSecret: process.env.STORAGE_SIGN_SECRET, // needed for local signed URLs
  disks: {
    local: { driver: 'local', config: { location: './storage', url: 'https://cdn.example.com' } },
    s3: { driver: 's3', config: { bucket: '...', region: '...', credentials: { accessKeyId: '...', secretAccessKey: '...' } } },
    r2: { driver: 'r2', config: { bucket: '...', endpoint: '...', credentials: { accessKeyId: '...', secretAccessKey: '...' } } },
    gcs: { driver: 'gcs', config: { bucket: '...' } },
    azure: { driver: 'azure', config: { containerName: '...', accountName: '...', accountKey: '...' } },
  },
});
```

`StorageModule.forRootAsync({ imports, inject, useFactory })` or `forRootAsync({ useClass })` for config that depends on other providers. `StorageModule` is `@Global()` — `StorageService` is injectable anywhere once imported once.

## StorageService

Inject `StorageService` and call methods on it directly — every method uses the default disk, or call `.disk(name)` first.

```ts
disk(name?): Disk
file(key): DriveFile
fromSnapshot(snapshot): DriveFile
exists(key): Promise<boolean>
get(key): Promise<string>
getStream(key): Promise<Readable>
getBytes(key): Promise<Uint8Array>
getMetaData(key): Promise<ObjectMetaData>
getVisibility(key): Promise<'public' | 'private'>
setVisibility(key, visibility): Promise<void>
getUrl(key): Promise<string>
getSignedUrl(key, options?): Promise<string>
getSignedUploadUrl(key, options?): Promise<string>
put(key, contents, options?): Promise<void>
putStream(key, contents, options?): Promise<void>
copy(source, destination, options?): Promise<void>
move(source, destination, options?): Promise<void>
copyFromFs(fsPath, destination, options?): Promise<void>
moveFromFs(fsPath, destination, options?): Promise<void>
delete(key): Promise<void>
deleteAll(prefix?): Promise<void>
listAll(prefix?, options?): Promise<{ paginationToken?, objects }>
getDefaultDisk(): string
getSignSecret(): string | undefined
getNamingStrategy(diskName?): NamingStrategy
fake(diskName?): FakeDisk
restore(diskName?): void
```

## File uploads

```ts
StorageFileInterceptor(field, options?)              // req.file: StoredFile
StorageFilesInterceptor(field, maxCount?, options?)   // req.files: StoredFile[]
StorageFileFieldsInterceptor(fields, options?)        // req.files: Record<field, StoredFile>
StorageFilesFieldsInterceptor(fields, maxCount?, options?) // req.files: Record<field, StoredFile[]>
```

`options`: `{ disk?, path?, namingStrategy?, fileFilter?, limits? }`. Read fields-based results with `@UploadedFileFields('name')`.

```ts
interface StoredFile { disk: string; path: string; size: number; mimetype: string; originalname: string }
```

## File validation

`FileExtensionValidator({ allowedExtensions })` is a `@nestjs/common` `FileValidator` for use with `ParseFilePipe`; rejects a file unless `path.extname(file.originalname)` (case-insensitive) is in `allowedExtensions` (leading dot optional).

## Naming strategies

`UuidNamingStrategy` (default), `OriginalNamingStrategy`, `HashNamingStrategy`, `DatePathNamingStrategy`, `DatePathUuidNamingStrategy`. Set per-disk via `namingStrategy`, or write your own: `(file: Uint8Array, originalName: string) => string | Promise<string>`.

## Signed URLs (local disk only)

Set `signSecret` on the module, generate with `storage.getSignedUrl(key, { expiresIn: '10mins' })`, verify with either:

```ts
@UseGuards(LocalSignedUrlGuard)       // throws ForbiddenException on failure
consumer.apply(LocalSignedUrlMiddleware).forRoutes(...)  // writes { message } + 403 itself
```

## Testing

```ts
const fake = storage.fake('local'); // fs-backed fake disk
await fake.put('a.txt', 'x');
fake.assertExists('a.txt');
storage.restore('local');
```

## Gotchas

- Constructing `StorageService` manually (outside Nest DI) requires `await service.init()` before use — `StorageModule` does this for you.
- `StorageFileInterceptor` (singular) puts the result on `req.file`; the other three put it on `req.files`.
- MinIO/B2/DigitalOcean Spaces/Wasabi are not separate driver names — configure them as `driver: 's3'` with the provider's `endpoint`.
- Azure `getSignedUrl`/`getSignedUploadUrl` need `accountName`/`accountKey`; a `connectionString`-only config can read/write but can't sign a SAS and rejects if you try.
