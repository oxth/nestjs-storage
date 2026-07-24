# Installation

```bash
npm install @oxth/nestjs-storage
```

`@nestjs/common` is a peer dependency — install whatever version your app already uses (`^10` or `^11`).

`flydrive` is a regular dependency (it's the storage engine behind every driver, including `local`). The SDKs for the other drivers are **optional peer dependencies** — only install the ones for the disks you actually configure:

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

## Why this works

`StorageService` resolves which driver module(s) to load lazily, based on the `driver` names actually present in your `disks` config, via a dynamic `import()` during its `init()` step (which `StorageModule` runs automatically before handing the service to Nest's DI container). A `local`-only config never triggers the `s3`/`r2`/`gcs`/`azure` imports at all, so those SDKs genuinely never need to be installed.

## Node version

This package requires **Node 24+** — the naming strategies use `node:crypto`'s `randomUUIDv7`, which isn't available on older Node versions.
