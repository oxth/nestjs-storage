# Drivers Overview

Every entry under `disks` has a `driver` name and a driver-specific `config`. The built-in drivers are:

| Driver | `config` shape | Notes |
| --- | --- | --- |
| [`local`](/drivers/local) | `{ location, url?, visibility?, ... }` | Reads/writes to the local filesystem. |
| [`s3`](/drivers/s3) | `{ bucket, region, credentials, cdn?, ... }` | Also covers MinIO, B2, DigitalOcean Spaces, Wasabi via `endpoint`. |
| [`r2`](/drivers/r2) | `{ bucket, endpoint, credentials, region? }` | Cloudflare R2 — same as `s3` with the right defaults baked in. |
| [`gcs`](/drivers/gcs) | `{ bucket, ... }` | Google Cloud Storage. |
| [`azure`](/drivers/azure) | `{ containerName, accountName, accountKey }` or `{ containerName, connectionString }` | Azure Blob Storage. |

Every driver's SDK dependency (`@aws-sdk/*`, `@google-cloud/storage`, `@azure/storage-blob`) is an **optional peer dependency**, loaded lazily only for the driver names actually present in your `disks` config — see [Installation](/guide/installation).

Need something not listed here (Azure Table Storage, an in-house object store, FTP, ...)? See [Custom Drivers](/drivers/custom-drivers).
