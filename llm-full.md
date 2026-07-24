# @oxth/nestjs-storage — full reference

Comprehensive API reference distilled from source. For a condensed version, see `llm.md`. For prose usage docs and examples, see `README.md`.

## Package shape

- Public entry: everything below is exported from `@oxth/nestjs-storage` (i.e. `src/index.ts`, re-exporting `constants`, `decorators`, `drivers` (only `LocalDriver`), `guards`, `helpers`, `interceptors`, `interfaces`, `middleware`, `storage.module`, `storage.service`, `strategies`).
- `S3Driver`/`R2Driver`/`AzureDriver` classes are **not** part of the public entry (only referenced internally by `StorageService`); they exist under `src/drivers/` but aren't re-exported, to keep them out of the eagerly-loaded module graph.
- Peer dependency: `@nestjs/common` (`^10.0.0 || ^11.0.0`, required).
- Regular dependency: `flydrive` (used unconditionally by every disk type, including `local`).
- Optional peer dependencies (`peerDependenciesMeta.optional: true`): `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (s3/r2 disks), `@google-cloud/storage` (gcs disks), `@azure/storage-blob` (azure disks), `@aws-sdk/cloudfront-signer` (CloudFront signed URLs on an s3 disk).
- Requires Node 24+ at runtime (naming strategies use `node:crypto`'s `randomUUIDv7`).

### Lazy driver loading

`StorageService.init()` (called automatically by `StorageModule`, see below) inspects `options.disks`, collects the distinct `driver` names in use, and only then dynamically `import()`s the corresponding driver module(s) — `./drivers/s3.driver.js` for `s3`, `./drivers/r2.driver.js` for `r2`, `flydrive/drivers/gcs` for `gcs`, `./drivers/azure.driver.js` for `azure`. `local` (via `LocalDriver`) is always statically imported since it has no heavy third-party dependency. This is why the S3/GCS/Azure SDKs can stay optional: a `local`-only config never triggers those imports at all.

## `STORAGE_MODULE_OPTIONS`

```ts
export const STORAGE_MODULE_OPTIONS: symbol;
```
The DI token `StorageModuleOptions` is registered under. Exported for advanced use (e.g. injecting the raw resolved options elsewhere).

## `StorageModule`

```ts
class StorageModule {
  static forRoot(options: StorageModuleOptions): DynamicModule;
  static forRootAsync(options: AsyncStorageModuleOptions): DynamicModule;
}
```

- `@Global()` — importing it once in any module makes `StorageService` injectable app-wide.
- Internally registers `StorageService` via a `useFactory` provider (`inject: [STORAGE_MODULE_OPTIONS]`) that constructs the instance and `await`s `service.init()` before handing it to Nest's DI container — consumers never see this, `StorageService` injection looks like any other provider.

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

## `StorageModuleOptions`

```ts
interface StorageModuleOptions<T extends Record<string, DiskOptions> = Record<string, DiskOptions>> {
  default: keyof T;            // name of the default disk
  signSecret?: string;         // enables local-disk signed URLs
  disks: T;                    // disk name -> DiskOptions
  drivers?: Driver[];          // custom/override driver factories
  fakes?: FakesConfig;         // where StorageService.fake() persists faked content; defaults to a temp dir
}

interface Driver {
  name: StorageDriver;                              // driver name to register/override, e.g. 'ftp' or 'local'
  driver: (options: unknown) => DriverContract;      // factory; DriverContract is flydrive's driver interface
}

type StorageDriver = 'local' | 's3' | 'r2' | 'gcs' | 'azure' | (string & {});

interface DiskOptions<T extends StorageDriver = StorageDriver> {
  driver: T;
  namingStrategy?: NamingStrategy;   // overrides the disk's default (UuidNamingStrategy) for uploads on this disk
  config: T extends 'local' ? LocalDriverOptions
        : T extends 's3'    ? S3DriverOptions
        : T extends 'r2'    ? R2DriverOptions
        : T extends 'gcs'   ? GCSDriverOptions   // from flydrive/drivers/gcs/types
        : T extends 'azure' ? AzureDriverOptions
        : Record<string, unknown>;
}
```

`drivers` entries are merged over the built-in `{ local, s3, r2, gcs, azure }` map — an entry whose `name` matches a built-in overrides it; any other name registers a new driver you can reference from `disks[x].driver`.

### `LocalDriverOptions`

```ts
type LocalDriverOptions = Omit<FSDriverOptions, 'visibility'> & {
  url?: string;                          // base URL used to build public/signed URLs; '' if omitted
  visibility?: 'public' | 'private';     // default: 'private'
};
// FSDriverOptions (from flydrive/drivers/fs/types) includes at least: location: URL | string
```

### `S3DriverOptions`

```ts
type S3DriverOptions = BaseS3DriverOptions & { cdn: CdnOptions };
// BaseS3DriverOptions (flydrive/drivers/s3/types): bucket, region, credentials, endpoint?, supportsACL?,
// cdnUrl?, visibility?, ...(anything accepted by @aws-sdk/client-s3's S3ClientConfig)

type CdnProvider = 'cloudfront' | (string & {});
type CdnOptions<T extends CdnProvider = CdnProvider> = {
  provider: T;
  signingKeyId: T extends 'cloudfront' ? string : never;
  signingKey: T extends 'cloudfront' ? string : never;
  [key: string]: unknown;
};
```
Only `provider: 'cloudfront'` is currently handled specially (see "S3Driver" below); other provider values are accepted by the type but have no special runtime behavior yet.

### `R2DriverOptions`

```ts
type R2DriverOptions = Omit<S3DriverOptions, 'visibility' | 'supportsACL' | 'endpoint' | 'region' | 'credentials'> & {
  credentials: { accessKeyId: string; secretAccessKey: string };
  endpoint: S3ClientConfig['endpoint'];   // required
  region?: S3ClientConfig['region'];      // defaults to 'auto'
};
```
`visibility` is always forced to `'private'` and `supportsACL` to `false` by `R2Driver`, regardless of what you pass.

### `AzureDriverOptions`

```ts
type AzureDriverOptions = {
  containerName: string;
  visibility?: ObjectVisibility;  // default: 'private'; used as the return value of getVisibility, no per-blob ACL exists
  cdnUrl?: string;                // optional custom domain/CDN URL for public URLs
} & (
  | { connectionString: string; accountName?: undefined; accountKey?: undefined }
  | { accountName: string; accountKey: string; connectionString?: undefined }
);
```
Exactly one auth method: `connectionString`, or `accountName` + `accountKey`. Only the `accountName`/`accountKey` form can generate signed URLs (it constructs a `StorageSharedKeyCredential` used to sign SAS tokens); `getSignedUrl`/`getSignedUploadUrl` reject with a plain `Error` if constructed with only a `connectionString`.

## `StorageService`

```ts
@Injectable()
class StorageService {
  constructor(@Inject(STORAGE_MODULE_OPTIONS) options: StorageModuleOptions);

  init(): Promise<void>;
  // Resolves driver(s) needed for `options.disks` and builds the internal
  // flydrive DriveManager. Called automatically by StorageModule. If you
  // construct StorageService yourself, call this once before using it —
  // every other method assumes it has already run.

  disk(name?: string): Disk;                                   // flydrive Disk for the named (or default) disk
  file(key: string): DriveFile;
  fromSnapshot(snapshot: FileSnapshot): DriveFile;

  exists(key: string): Promise<boolean>;
  get(key: string): Promise<string>;
  getStream(key: string): Promise<Readable>;
  getBytes(key: string): Promise<Uint8Array>;
  /** @deprecated use getBytes */
  getArrayBuffer(key: string): Promise<Uint8Array>;
  getMetaData(key: string): Promise<ObjectMetaData>;           // { contentType?, contentLength, etag, lastModified }
  getVisibility(key: string): Promise<ObjectVisibility>;       // 'public' | 'private'
  setVisibility(key: string, visibility: ObjectVisibility): Promise<void>;

  getUrl(key: string): Promise<string>;
  getSignedUrl(key: string, options?: SignedURLOptions): Promise<string>;
  getSignedUploadUrl(key: string, options?: SignedURLOptions): Promise<string>;

  put(key: string, contents: string | Uint8Array, options?: WriteOptions): Promise<void>;
  putStream(key: string, contents: Readable, options?: WriteOptions): Promise<void>;
  copy(source: string, destination: string, options?: WriteOptions): Promise<void>;
  copyFromFs(source: string | URL, destination: string, options?: WriteOptions): Promise<void>;
  move(source: string, destination: string, options?: WriteOptions): Promise<void>;
  moveFromFs(source: string | URL, destination: string, options?: WriteOptions): Promise<void>;
  delete(key: string): Promise<void>;
  deleteAll(prefix?: string): Promise<void>;
  listAll(prefix?: string, options?: { recursive?: boolean; paginationToken?: string }):
    Promise<{ paginationToken?: string; objects: Iterable<DriveFile | DriveDirectory> }>;

  getDefaultDisk(): string;                       // options.default
  getSignSecret(): string | undefined;             // options.signSecret
  getNamingStrategy(diskName?: string): NamingStrategy; // disk's configured strategy, else UuidNamingStrategy

  fake(diskName?: string): FakeDisk;
  restore(diskName?: string): void;
}
```

`SignedURLOptions`, `WriteOptions`, `ObjectMetaData`, `ObjectVisibility`, `FileSnapshot`, `DriverContract` are flydrive types (`flydrive/types`). `Disk`, `DriveFile`, `DriveDirectory` are flydrive classes (`flydrive`).

### `FakeDisk`

```ts
interface FakeDisk extends Disk {
  assertExists(paths: string | string[]): void;   // throws AssertionError if any path is missing
  assertMissing(paths: string | string[]): void;  // throws AssertionError if any path exists
  clear(): void;                                  // wipe the fake's backing storage
}
```
Backed by flydrive's `FSDriver` under the hood — a real (temp-dir, by default) filesystem location, not an in-memory mock. `StorageService.fake(name)` swaps the named disk for this; every subsequent call through `StorageService` (or `.disk(name)`) for that disk name transparently uses the fake until `restore(name)` is called.

```ts
interface FakesConfig {
  location: URL | string;        // root dir the fake writes under; default: <tmpdir>/oxth-nestjs-storage-fakes
  urlBuilder?: FakeUrlBuilder;
}
interface FakeUrlBuilder {
  generateURL?(key: string, filePath: string): Promise<string>;
  generateSignedURL?(key: string, filePath: string, options: SignedURLOptions): Promise<string>;
  generateSignedUploadURL?(key: string, filePath: string, options: SignedURLOptions): Promise<string>;
}
```

## Drivers

### `LocalDriver` (exported)

```ts
class LocalDriver extends FSDriver {
  constructor(options: LocalDriverOptions, signSecret?: string);
  static getUrlBuilder(url?: string, signSecret?: string): LocalDriverOptions['urlBuilder'];
}
```

- `getUrl(key)`: `new URL(baseUrl + '/' + key.replace(/^\//, '')).toString()`. `baseUrl` defaults to `''` — if `url` isn't configured, this throws (`new URL('/key')` with no base is invalid). Always set `url` if you'll call `getUrl`/`getSignedUrl`.
- `getSignedUrl(key, options?)`: if `signSecret` wasn't passed to the constructor, logs `console.warn(...)` and returns the **unsigned** URL. Otherwise computes `expiresAt = floor(Date.now()/1000) + parse(options?.expiresIn ?? '30mins')`, signs `` `${pathname}:${expiresAt}` `` with HMAC-SHA256 using `signSecret`, and appends `?expires=<epoch>&signature=<hex>`.
- The constructor is passed `signSecret` by `StorageService` from the top-level `StorageModuleOptions.signSecret` — it is not part of `LocalDriverOptions` itself.
- Default `visibility`: `'private'`.

### `S3Driver` (internal, not exported)

```ts
class S3Driver extends BaseS3Driver /* from flydrive/drivers/s3 */ {
  constructor(options: S3DriverOptions); // destructures `cdn` out before passing the rest to the base driver
  getCloudfrontSignedUrl(key: string, options?: SignedURLOptions): Promise<string>;
  getSignedUrl(key: string, options?: SignedURLOptions): Promise<string>; // override
}
```
- `getSignedUrl`: if `options.cdnUrl` is set **and** `cdn.provider === 'cloudfront'`, delegates to `getCloudfrontSignedUrl`; otherwise delegates to the base flydrive `S3Driver.getSignedUrl` (plain S3 presigned URL).
- `getCloudfrontSignedUrl`: throws a plain `Error` if `cdn.provider !== 'cloudfront'`. Dynamically `import('@aws-sdk/cloudfront-signer')`; if that import fails, throws `Error('@aws-sdk/cloudfront-signer is required for CloudFront signed URLs. Install it with: npm install @aws-sdk/cloudfront-signer')`. On success, resolves the object's public `getUrl(key)`, computes `dateLessThan` from `options?.expiresIn` (default `'30mins'`), and calls the SDK's `getSignedUrl({ url, keyPairId: cdn.signingKeyId, privateKey: cdn.signingKey, dateLessThan })`.

### `R2Driver` (internal, not exported)

```ts
class R2Driver extends S3Driver {
  constructor(options: R2DriverOptions);
  // forwards to S3Driver with: region: options.region || 'auto', visibility: 'private', supportsACL: false
}
```

### GCS

No wrapper class — `StorageService` uses flydrive's `GCSDriver` (`flydrive/drivers/gcs`) directly, constructed with the disk's `config` as-is.

### `AzureDriver` (internal, not exported)

```ts
class AzureDriver implements DriverContract {
  constructor(options: AzureDriverOptions);
  bucket(containerName: string): AzureDriver; // returns a new AzureDriver bound to a different container, same credentials
}
```
No flydrive base class to extend (flydrive has no Azure driver) — implements `DriverContract` directly against `@azure/storage-blob`'s `BlobServiceClient`/`ContainerClient`/`BlockBlobClient`.

- Construction: `connectionString` → `BlobServiceClient.fromConnectionString(...)`; `accountName`/`accountKey` → `new StorageSharedKeyCredential(accountName, accountKey)` + `new BlobServiceClient(https://${accountName}.blob.core.windows.net, credential)`. Either way, `client.getContainerClient(containerName)` is cached on the instance.
- `get`/`getBytes`: `blockBlobClient.downloadToBuffer()`; `get` decodes the result as UTF-8.
- `getStream`: `blockBlobClient.download()`, returns `response.readableStreamBody`.
- `getMetaData`: `blockBlobClient.getProperties()`, mapping `contentLength ?? 0`, `etag ?? ''`, `lastModified ?? new Date()`.
- `getVisibility`: always returns the configured (constructor) `visibility` — Azure has no per-blob ACL. `setVisibility` is a no-op.
- `getUrl`: `cdnUrl` set → `new URL(key, cdnUrl).toString()`; otherwise `blockBlobClient.url` (the direct Azure endpoint URL, only publicly fetchable if the container/blob is actually public).
- `getSignedUrl(key, options?)` / `getSignedUploadUrl(key, options?)`: build a SAS via `generateBlobSASQueryParameters({ containerName, blobName: key, permissions: BlobSASPermissions.parse('r' | 'cw'), expiresOn, contentType?, contentDisposition? }, sharedKeyCredential)`, appended to the blob URL as a query string. `expiresOn` = `Date.now() + parse(options?.expiresIn ?? '30mins') * 1000`. Throws `Error('Signed URLs require the "azure" driver to be configured with accountName/accountKey...')` (as a rejected promise) if constructed with only a `connectionString`.
- `put`: `Buffer.from(contents)` then `blockBlobClient.uploadData(buffer, { blobHTTPHeaders: {...mapped from WriteOptions} })`.
- `putStream`: `blockBlobClient.uploadStream(stream, undefined, undefined, { blobHTTPHeaders: {...} })`.
- `copy`: `destinationBlobClient.syncCopyFromURL(sourceBlobClient.url)` (same-account copy, no polling needed).
- `move`: `copy()` then `delete(source)`.
- `delete`: `blockBlobClient.deleteIfExists()`.
- `deleteAll(prefix)`: normalizes `'/'` to `''`, iterates `containerClient.listBlobsFlat({ prefix })`, `deleteIfExists()` on each.
- `listAll(prefix, options?)`: normalizes `'/'` to `''`. `options?.recursive` → `containerClient.listBlobsFlat({ prefix }).byPage({ continuationToken }).next()`, maps `segment.blobItems` to `DriveFile`s only (no directories). Otherwise → `containerClient.listBlobsByHierarchy('/', { prefix }).byPage({ continuationToken }).next()`, maps `segment.blobItems` to `DriveFile`s and `segment.blobPrefixes` to `DriveDirectory`s. Only reads a single page per call either way; `paginationToken` in the result is that page's `continuationToken` (pass it back in as `options.paginationToken` to get the next page).

## Decorators

```ts
const UploadedFileFields: (fieldName: string) => ParameterDecorator;
```
Reads `request.files?.[fieldName]` and returns it (a `StoredFile` for one-file-per-field interceptors, `StoredFile[]` for multi-file-per-field). Returns `undefined` if `request.files` or the field is absent. **Only meaningful after** `StorageFileFieldsInterceptor` or `StorageFilesFieldsInterceptor` (both populate `req.files` as a field-name-keyed map); the plain `StorageFileInterceptor`/`StorageFilesInterceptor` put results on `req.file`/`req.files` (array) instead, not field-keyed.

## Interceptors

All four are factories returning a class usable with `@UseInterceptors(...)`. All accept a trailing `StorageFileInterceptorOptions`:

```ts
interface StorageFileInterceptorOptions {
  disk?: string;                    // default: StorageService.getDefaultDisk()
  path?: string;                    // key prefix; default: root
  namingStrategy?: NamingStrategy;  // default: StorageService.getNamingStrategy(disk)
  fileFilter?: (req: any, file: any, cb: any) => void;  // passed straight to multer
  limits?: { fileSize?: number; files?: number };        // passed straight to multer
}
```

```ts
StorageFileInterceptor(fieldName: string, options?): Type<NestInterceptor>;
// multer .single(fieldName). If no file uploaded: calls next.handle() immediately, req.file untouched.
// Otherwise: uploads to disk, sets req.file = StoredFile.

StorageFilesInterceptor(fieldName: string, maxCount = 10, options?): Type<NestInterceptor>;
// multer .array(fieldName, maxCount). If no files (or an explicitly empty array): req.files = [], next.handle().
// Otherwise: uploads each file, sets req.files = StoredFile[].

StorageFileFieldsInterceptor(fieldNames: string[], options?): Type<NestInterceptor>;
// multer .fields(fieldNames.map(name => ({ name, maxCount: 1 }))). If req.files absent: next.handle() untouched.
// Otherwise: for each field with >=1 file, uploads and sets req.files[field] = StoredFile (fields with an
// empty array are skipped entirely — not present as a key in the result).

StorageFilesFieldsInterceptor(fieldNames: string[], maxCount?: number, options?): Type<NestInterceptor>;
// multer .fields(fieldNames.map(name => ({ name, maxCount }))). If req.files absent: next.handle() untouched.
// Otherwise: req.files[field] = StoredFile[] for every field in fieldNames (fields with no uploaded files
// end up as [] — always present, unlike StorageFileFieldsInterceptor).
```

All four: on a multer error, the error is passed through `@nestjs/platform-express`'s `transformException` (maps known multer/busboy error messages to `PayloadTooLargeException`/`BadRequestException`; otherwise passes the error through unchanged) and the promise rejects with it.

```ts
interface StoredFile {
  disk: string;          // the disk it was written to
  path: string;          // key/path within that disk
  size: number;
  mimetype: string;
  originalName: string;  // original client-provided filename
}
```

## Naming strategies

```ts
type NamingStrategy<T = Uint8Array> = (file: T, originalName: string) => string | Promise<string>;

UuidNamingStrategy: NamingStrategy;              // `${randomUUIDv7()}${ext}`
OriginalNamingStrategy: NamingStrategy;          // originalName, unchanged
HashNamingStrategy: NamingStrategy;              // `${sha256(file)}${ext}` (hex)
DatePathNamingStrategy: NamingStrategy;          // `${yyyy}/${mm}/${dd}/${originalNameWithoutExt}${ext}`
DatePathUuidNamingStrategy: NamingStrategy;      // `${yyyy}/${mm}/${dd}/${randomUUIDv7()}${ext}`
```
Date components use the local system clock at call time (`new Date()`), zero-padded to 2 digits for month/day.

## Signed URL enforcement (local disk)

Both share one verification routine (`verifySignedUrl(req, signSecret)` from `src/helpers/signed-url.helper.ts`, also exported): reads `req.query.expires` / `req.query.signature`; fails with `'Missing signature parameters'` if either is absent; parses `expires` as an integer and fails with `'URL has expired'` if it's `NaN` or in the past; otherwise recomputes the HMAC-SHA256 signature over `` `${new URL(req.originalUrl, `${req.protocol}://${req.host}`).pathname}:${expires}` `` using `signSecret` and does a length-checked `timingSafeEqual` against the provided signature (hex-decoded), failing with `'Invalid signature'` on any mismatch or decode error.

```ts
@Injectable()
class LocalSignedUrlGuard implements CanActivate {
  constructor(storageService: StorageService);
  canActivate(context: ExecutionContext): boolean;
  // No signSecret configured -> returns true immediately (no verification).
  // Otherwise verifies via verifySignedUrl(); on failure throws
  // `new ForbiddenException(reason)` (reason is one of the three messages above).
}

@Injectable()
class LocalSignedUrlMiddleware implements NestMiddleware {
  constructor(storageService: StorageService);
  use(req: Request, res: Response, next: NextFunction): void;
  // No signSecret configured -> calls next() immediately.
  // Otherwise verifies via verifySignedUrl(); on failure calls
  // res.status(403).json({ message: reason }) and does not call next().
}
```
Functionally identical checks; the guard throws Nest's standard exception shape (`{ statusCode, message, error }`), the middleware writes a bare `{ message }` body itself.

## Helper functions (exported, mostly internal-use)

```ts
function generateFileName(strategy: NamingStrategy, file: Express.Multer.File, storedPath?: string): Promise<string>;
// path.join(storedPath ?? '', await strategy(file.buffer, file.originalname))

function verifySignedUrl(
  req: Pick<Request, 'query' | 'originalUrl' | 'protocol' | 'host'>,
  signSecret: string,
): { valid: true } | { valid: false; reason: 'Missing signature parameters' | 'URL has expired' | 'Invalid signature' };
```
