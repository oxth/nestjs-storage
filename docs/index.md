---
layout: home

hero:
  name: '@oxth/nestjs-storage'
  text: Unified storage for NestJS
  tagline: One StorageService for Local, S3, R2, GCS, Azure, and any S3-compatible service. Switch backends in config, not code.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Browse drivers
      link: /drivers/
    - theme: alt
      text: GitHub
      link: https://github.com/oxth/nestjs-storage

features:
  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
    title: Five drivers, one API
    details: Local, S3, Cloudflare R2, Google Cloud Storage, and Azure Blob — plus MinIO, B2, Spaces, and Wasabi via a custom S3 endpoint.
    link: /drivers/
    linkText: Explore drivers

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
    title: SDKs stay optional
    details: Cloud SDKs are imported lazily, only for disk types you configure. A local-only app never installs or loads them.
    link: /guide/installation
    linkText: Installation guide

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    title: Uploads that stream to disk
    details: Four Multer-based interceptors write files straight to any disk and hand you a plain StoredFile — no buffers left in memory.
    link: /guide/file-uploads
    linkText: File uploads

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    title: Signed URLs everywhere
    details: Presigned S3/R2/GCS URLs, Azure SAS, CloudFront signing, and HMAC-signed local URLs enforced by a Guard or Middleware.
    link: /guide/signed-urls
    linkText: Signed URLs

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    title: Fake disks for tests
    details: Swap any disk for a filesystem-backed fake with assertExists and assertMissing. Strict TypeScript, 100% coverage in CI.
    link: /guide/testing
    linkText: Testing guide

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    title: AI-ready reference
    details: Ships llm.md and llm-full.md, condensed and exhaustive API references for Claude, Cursor, and other coding assistants.
    link: https://github.com/oxth/nestjs-storage/blob/main/llm.md
    linkText: View llm.md
---

<div class="ns-home">

<section class="ns-section" aria-labelledby="install">

<p class="ns-eyebrow">Install</p>
<h2 id="install">Start with just the core</h2>
<p class="ns-lead">The local driver works out of the box. Add a cloud SDK only when you configure a disk that needs it.</p>

::: code-group

```bash [pnpm]
pnpm add @oxth/nestjs-storage

# only for the disks you use
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner   # s3, r2
pnpm add @google-cloud/storage                               # gcs
pnpm add @azure/storage-blob                                 # azure
```

```bash [npm]
npm install @oxth/nestjs-storage

# only for the disks you use
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner # s3, r2
npm install @google-cloud/storage                            # gcs
npm install @azure/storage-blob                              # azure
```

```bash [yarn]
yarn add @oxth/nestjs-storage

# only for the disks you use
yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner    # s3, r2
yarn add @google-cloud/storage                                # gcs
yarn add @azure/storage-blob                                  # azure
```

:::

</section>

<section class="ns-section" aria-labelledby="configure">

<p class="ns-eyebrow">Configure</p>
<h2 id="configure">Change the backend, keep the code</h2>
<p class="ns-lead">Each disk is a driver name plus its config. Your services and controllers call the same <code>StorageService</code> methods whichever one you pick.</p>

::: code-group

```ts [local]
StorageModule.forRoot({
  default: 'files',
  disks: {
    files: {
      driver: 'local',
      config: { location: './storage', url: 'http://localhost:3000/files' },
    },
  },
});
```

```ts [s3]
StorageModule.forRoot({
  default: 'files',
  disks: {
    files: {
      driver: 's3',
      config: {
        bucket: 'my-bucket',
        region: 'us-east-1',
        credentials: { accessKeyId: '...', secretAccessKey: '...' },
      },
    },
  },
});
```

```ts [r2]
StorageModule.forRoot({
  default: 'files',
  disks: {
    files: {
      driver: 'r2',
      config: {
        bucket: 'my-bucket',
        endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
        credentials: { accessKeyId: '...', secretAccessKey: '...' },
      },
    },
  },
});
```

```ts [gcs]
StorageModule.forRoot({
  default: 'files',
  disks: {
    files: { driver: 'gcs', config: { bucket: 'my-bucket' } },
  },
});
```

```ts [azure]
StorageModule.forRoot({
  default: 'files',
  disks: {
    files: {
      driver: 'azure',
      config: {
        containerName: 'my-container',
        accountName: 'mystorageaccount',
        accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
      },
    },
  },
});
```

:::

```ts
// The same code runs against every disk above.
await this.storage.put('avatars/42.png', bytes);
const url = await this.storage.getSignedUrl('avatars/42.png', {
  expiresIn: '15m',
});
```

</section>

<div class="ns-cta">
  <p>Ready to wire it into your app?</p>
  <a class="ns-button" href="./guide/">Read the guide</a>
</div>

</div>
