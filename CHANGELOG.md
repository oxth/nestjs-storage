# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-07-24

Initial release.

### Added

- `StorageModule.forRoot()` / `forRootAsync()` and `StorageService`, a single unified API over multiple named disks with a configurable default.
- Drivers: `local`, `s3` (also covers MinIO/B2/DigitalOcean Spaces/Wasabi via a custom `endpoint`), `r2`, `gcs`, and `azure`.
- CloudFront signed URLs for the `s3` driver.
- Support for registering custom drivers via `StorageModuleOptions.drivers`.
- Lazy, per-driver dynamic loading in `StorageService` so the S3/GCS/Azure SDKs are genuinely optional — a `local`-only app never loads them. `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@google-cloud/storage`, `@azure/storage-blob`, and `@aws-sdk/cloudfront-signer` are optional peer dependencies.
- Upload interceptors: `StorageFileInterceptor`, `StorageFilesInterceptor`, `StorageFileFieldsInterceptor`, `StorageFilesFieldsInterceptor`, plus the `@UploadedFileFields()` param decorator.
- Naming strategies: `UuidNamingStrategy` (default), `OriginalNamingStrategy`, `HashNamingStrategy`, `DatePathNamingStrategy`, `DatePathUuidNamingStrategy`.
- HMAC-signed URLs for the `local` disk, enforced via `LocalSignedUrlGuard` or `LocalSignedUrlMiddleware`.
- `StorageService.fake()` / `.restore()` — a real-filesystem-backed fake disk for tests, with `assertExists`/`assertMissing`/`clear`.
- `README.md`, `CONTRIBUTING.md`, and `llm.md`/`llm-full.md` (condensed and exhaustive API references).
- CI: lint/test/build on every push and pull request; a tag-triggered (`v*`) publish workflow authenticated via npm's OIDC Trusted Publisher; a weekly scheduled dependency-update workflow that opens a pull request rather than pushing to `main` directly.

[Unreleased]: https://github.com/oxth/nestjs-storage/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/oxth/nestjs-storage/releases/tag/v0.1.0
