# Drivers Overview

Every entry under `disks` has a `driver` name and a driver-specific `config`. The built-in drivers are:

| Driver | `config` shape | Notes |
| --- | --- |
| [`local`](/drivers/local) | `{ location, url?, visibility?, ... }` | Reads/writes to the local filesystem. |
| [`s3`](/drivers/s3) | `{ bucket, region, credentials, cdn?, ... }` | Also covers MinIO, B2, DigitalOcean Spaces, Wasabi via `endpoint`. |
| [`r2`](/drivers/r2) | `{ bucket, endpoint, credentials, region? }` | Cloudflare R2 — same as `s3` with the right defaults baked in. |
| [`gcs`](/drivers/gcs) | `{ bucket, ... }` | Google Cloud Storage. |
| [`azure`](/drivers/azure) | `{ containerName, accountName, accountKey }` or `{ containerName, connectionString }` | Azure Blob Storage. |

## Feature support

Every driver exposes the same `StorageService` methods, but not every backend can do everything behind them:

| Driver | Signed download URL | Signed upload URL | Visibility | `getUrl()` / CDN |
| --- | --- | --- | --- | --- |
| `local` | Needs `signSecret`&nbsp;<sup>1</sup> | Not supported&nbsp;<sup>2</sup> | Fixed, from config | `url` option |
| `s3` | Yes, or CloudFront&nbsp;<sup>3</sup> | Yes | Per object&nbsp;<sup>4</sup> | `cdnUrl` |
| `r2` | Yes, or CloudFront&nbsp;<sup>3</sup> | Yes | Always private | `cdnUrl` |
| `gcs` | Yes | Yes | Per object&nbsp;<sup>5</sup> | Bucket public URL |
| `azure` | Needs account key&nbsp;<sup>6</sup> | Needs account key&nbsp;<sup>6</sup> | Fixed, from config&nbsp;<sup>7</sup> | `cdnUrl` |

1. Without a top-level `signSecret`, `getSignedUrl()` logs a warning and returns an **unsigned** URL. Both `getUrl()` and `getSignedUrl()` throw if the disk has no `url`. See [Local](/drivers/local#signed-urls).
2. `getSignedUploadUrl()` throws on the local disk. Use an [upload interceptor](/guide/file-uploads) instead.
3. With `cdnUrl` set and `cdn: { provider: 'cloudfront', ... }`, download URLs are signed through CloudFront (also needs `@aws-sdk/cloudfront-signer`). Upload URLs are always S3-presigned. See [CloudFront signed URLs](/drivers/s3#cloudfront-signed-urls).
4. Real per-object ACLs, unless you set `supportsACL: false` (common for S3-compatible services).
5. Uses per-object ACLs, so `setVisibility()` won't work on buckets with uniform bucket-level access enabled.
6. Needs `accountName` + `accountKey` to sign a SAS token. With only a `connectionString`, both methods reject with an error. Signed URLs point at the storage account, not `cdnUrl`.
7. Azure has no per-blob ACL. `getVisibility()` returns the configured `visibility` and `setVisibility()` does nothing. See [Azure](/drivers/azure).

Every driver's SDK dependency (`@aws-sdk/*`, `@google-cloud/storage`, `@azure/storage-blob`) is an **optional peer dependency**, loaded lazily only for the driver names actually present in your `disks` config — see [Installation](/guide/installation).

Need something not listed here (Azure Table Storage, an in-house object store, FTP, ...)? See [Custom Drivers](/drivers/custom-drivers).
