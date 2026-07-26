# Interfaces & Types

## `StorageModuleOptions`

```ts
interface StorageModuleOptions<T extends Record<string, DiskOptions> = Record<string, DiskOptions>> {
  default: keyof T;    // name of the default disk
  signSecret?: string; // enables local-disk signed URLs
  disks: T;            // disk name -> DiskOptions
  drivers?: Driver[];  // custom/override driver factories
  fakes?: FakesConfig; // where StorageService.fake() persists faked content; defaults to a temp dir
}

interface DiskOptions<T extends StorageDriver = StorageDriver> {
  driver: T;
  namingStrategy?: NamingStrategy; // overrides the disk's default (UuidNamingStrategy)
  config: /* LocalDriverOptions | S3DriverOptions | R2DriverOptions | GCSDriverOptions | AzureDriverOptions, based on T */;
}

type StorageDriver = 'local' | 's3' | 'r2' | 'gcs' | 'azure' | (string & {});

interface Driver {
  name: StorageDriver;
  driver: (options: unknown) => DriverContract; // DriverContract is flydrive's driver interface
}
```

## Async options

```ts
interface AsyncStorageModuleOptions {
  imports?: ModuleMetadata['imports'];
  inject?: Array<Type<any> | string | symbol | Abstract<any> | Function>;
  useClass?: Type<StorageOptionsFactory>;
  useFactory?: (...args: any[]) => StorageModuleOptions | Promise<StorageModuleOptions>;
}

interface StorageOptionsFactory {
  createStorageOptions(): StorageModuleOptions | Promise<StorageModuleOptions>;
}
```

Exactly one of `useFactory` / `useClass` is expected. With `useClass`, the class is itself registered as a provider and must implement `StorageOptionsFactory`.

## Driver config types

See each driver's page for a config example: [Local](/drivers/local), [S3](/drivers/s3), [R2](/drivers/r2), [GCS](/drivers/gcs), [Azure](/drivers/azure).

```ts
type LocalDriverOptions = Omit<FSDriverOptions, 'visibility'> & {
  url?: string;
  visibility?: 'public' | 'private'; // default: 'private'
};

type S3DriverOptions = BaseS3DriverOptions & { cdn: CdnOptions };
// BaseS3DriverOptions: bucket, region, credentials, endpoint?, supportsACL?, cdnUrl?, visibility?, ...

type R2DriverOptions = Omit<S3DriverOptions, 'visibility' | 'supportsACL' | 'endpoint' | 'region' | 'credentials'> & {
  credentials: { accessKeyId: string; secretAccessKey: string };
  endpoint: S3ClientConfig['endpoint']; // required
  region?: S3ClientConfig['region'];    // defaults to 'auto'
};

type AzureDriverOptions = {
  containerName: string;
  visibility?: ObjectVisibility;
  cdnUrl?: string;
} & (
  | { connectionString: string; accountName?: undefined; accountKey?: undefined }
  | { accountName: string; accountKey: string; connectionString?: undefined }
);

type CdnProvider = 'cloudfront' | (string & {});
type CdnOptions<T extends CdnProvider = CdnProvider> = {
  provider: T;
  signingKeyId: T extends 'cloudfront' ? string : never;
  signingKey: T extends 'cloudfront' ? string : never;
  [key: string]: unknown;
};
```

## `StoredFile`

Produced by the [upload interceptors](/guide/file-uploads):

```ts
interface StoredFile {
  disk: string;          // the disk it was written to
  path: string;          // key/path within that disk
  size: number;
  mimetype: string;
  originalName: string;  // original client-provided filename
}
```

## `FakeDisk` / `FakesConfig`

Used by [`StorageService.fake()`](/guide/testing):

```ts
interface FakeDisk extends Disk {
  assertExists(paths: string | string[]): void;
  assertMissing(paths: string | string[]): void;
  clear(): void;
}

interface FakesConfig {
  location: URL | string; // root dir the fake writes under; default: <tmpdir>/oxth-nestjs-storage-fakes
  urlBuilder?: FakeUrlBuilder;
}
```

## `NamingStrategy`

```ts
type NamingStrategy<T = Uint8Array> = (file: T, originalName: string) => string | Promise<string>;
```

## `StorageFileInterceptorOptions`

Accepted by all four [upload interceptors](/guide/file-uploads):

```ts
interface StorageFileInterceptorOptions {
  disk?: string;
  path?: string;
  namingStrategy?: NamingStrategy;
  fileFilter?: (req: any, file: any, cb: any) => void; // passed straight to multer
  limits?: { fileSize?: number; files?: number };       // passed straight to multer
}
```

## Helper functions

Exported for reuse outside the built-in interceptors/guard/middleware — see [Signed URLs](/guide/signed-urls#verifying-signatures-outside-http-controllers) for `verifySignedUrl` in context:

```ts
function verifySignedUrl(
  req: Pick<Request, 'query' | 'originalUrl' | 'protocol' | 'host'>,
  signSecret: string,
): SignedUrlVerificationResult;

type SignedUrlRejectionReason =
  | 'Missing signature parameters'
  | 'URL has expired'
  | 'Invalid signature';

type SignedUrlVerificationResult =
  | { valid: true }
  | { valid: false; reason: SignedUrlRejectionReason };

function generateFileName(
  strategy: NamingStrategy,
  file: Express.Multer.File,
  storedPath?: string,
): Promise<string>;
// path.join(storedPath ?? '', await strategy(file.buffer, file.originalname))
```

`generateFileName` is what every upload interceptor uses internally to turn a naming strategy's result into a full stored path; only worth reaching for directly if you're building a fully custom interceptor from scratch instead of using the four built-in ones.

## `LocalDriver`

The only concrete driver class exported directly (the `s3`/`r2`/`gcs`/`azure` drivers are resolved lazily by name and not part of the public API). It's flydrive's `FSDriver` with a `local`-specific URL builder (plain or HMAC-signed, depending on whether `signSecret` was set). See [Custom Drivers](/drivers/custom-drivers) if you want to extend or wrap it.

---

`SignedURLOptions`, `WriteOptions`, `ObjectMetaData`, `ObjectVisibility`, `FileSnapshot`, `DriverContract` are flydrive types (`flydrive/types`). `Disk`, `DriveFile`, `DriveDirectory` are flydrive classes (`flydrive`). For the exhaustive version of every type here, plus internal driver behavior, see [`llm-full.md`](https://github.com/oxth/nestjs-storage/blob/main/llm-full.md).
