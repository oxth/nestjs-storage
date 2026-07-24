---
layout: home

hero:
  name: '@oxth/nestjs-storage'
  text: Unified Storage for NestJS
  tagline: One API. Five storage drivers, plus any S3-compatible service. Optional SDKs stay optional.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/oxth/nestjs-storage

features:
  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
    title: 5 Storage Drivers
    details: Local filesystem, S3, Cloudflare R2, Google Cloud Storage, and Azure Blob Storage — plus any S3-compatible service (MinIO, B2, DigitalOcean Spaces, Wasabi) via a custom endpoint. Switch by changing config, not code.
    link: /drivers/
    linkText: Explore drivers

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    title: Optional, Lazily-Loaded SDKs
    details: The S3/GCS/Azure driver modules are only dynamically imported when a disk of that type is actually configured. A local-only app never installs or loads @aws-sdk, @google-cloud/storage, or @azure/storage-blob.
    link: /guide/installation
    linkText: Installation guide

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    title: Type-Safe & Fully Tested
    details: Strict TypeScript throughout, and 100% statement/branch/function/line coverage enforced in CI — every driver, interceptor, and edge case has a test behind it.

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    title: NestJS Native
    details: StorageModule.forRoot/forRootAsync, an @Global() StorageService for DI anywhere, four Multer-based upload interceptors, and a Guard/Middleware pair for signed local URLs.
    link: /guide/configuration
    linkText: Configuration guide

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    title: AI-Ready Documentation
    details: Ships with llm.md and llm-full.md — condensed and exhaustive reference files purpose-built for feeding into Claude, Cursor, and other AI coding assistants.
    link: https://github.com/oxth/nestjs-storage/blob/main/llm.md
    linkText: View llm.md

  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    title: Signed URLs & Testing Built In
    details: HMAC-signed, expiring URLs for the local disk via a Guard or Middleware, and a real-filesystem-backed fake disk (assertExists/assertMissing/clear) so tests never touch production storage.
    link: /guide/testing
    linkText: Testing guide
---
