# Custom Drivers

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

A driver factory just needs to return an object implementing flydrive's `DriverContract` — the same interface every built-in driver implements:

```ts
interface DriverContract {
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<string>;
  getStream(key: string): Promise<Readable>;
  getBytes(key: string): Promise<Uint8Array>;
  getMetaData(key: string): Promise<ObjectMetaData>;
  getVisibility(key: string): Promise<ObjectVisibility>;
  getUrl(key: string): Promise<string>;
  getSignedUrl(key: string, options?: SignedURLOptions): Promise<string>;
  getSignedUploadUrl(key: string, options?: SignedURLOptions): Promise<string>;
  setVisibility(key: string, visibility: ObjectVisibility): Promise<void>;
  put(key: string, contents: string | Uint8Array, options?: WriteOptions): Promise<void>;
  putStream(key: string, contents: Readable, options?: WriteOptions): Promise<void>;
  copy(source: string, destination: string, options?: WriteOptions): Promise<void>;
  move(source: string, destination: string, options?: WriteOptions): Promise<void>;
  delete(key: string): Promise<void>;
  deleteAll(prefix: string): Promise<void>;
  listAll(prefix: string, options?: { recursive?: boolean; paginationToken?: string }):
    Promise<{ paginationToken?: string; objects: Iterable<DriveFile | DriveDirectory> }>;
  bucket(bucket: string): DriverContract;
}
```

A `drivers` entry whose `name` matches a built-in (`local`, `s3`, `r2`, `gcs`, `azure`) **overrides** that built-in; any other name registers a new driver you can reference from `disks[x].driver`.

`@oxth/nestjs-storage`'s own [`AzureDriver`](https://github.com/oxth/nestjs-storage/blob/main/src/drivers/azure.driver.ts) is a good reference for implementing `DriverContract` from scratch against a third-party SDK, since flydrive has no built-in Azure driver to extend (unlike S3/GCS).
