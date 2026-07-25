# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Upgraded TypeScript from 5.9 to 6.0. Dropped the deprecated `baseUrl` compiler option (`paths` resolves relative to `tsconfig.json` without it) and added an explicit `rootDir` to keep `dist/` output flat under the new default rootDir behavior.

## [0.1.2] - 2026-07-24

### Added

- Documentation site (VitePress, under `docs/`), deployed to GitHub Pages via `.github/workflows/docs.yml` on every push to `main`.

### Changed

- Replaced the custom weekly dependency-update workflow with [Dependabot](.github/dependabot.yml), which opens one pull request per outdated dependency (npm packages and GitHub Actions) instead of one bundled PR for everything.
- `publish.yml` now commits the tag-derived version bump back to `main` after a successful publish, instead of only setting it in the ephemeral release checkout — `main`'s `package.json` no longer stays stale after a release.
- Releases are now cut with `pnpm version patch|minor|major`, wired to `preversion` (lint + test gate) and `postversion` (`git push --follow-tags`) hooks — see [Cutting a Release](./CONTRIBUTING.md#cutting-a-release).

### Fixed

- `publish.yml`'s internal `pnpm version` calls now pass `--ignore-scripts`, so the `preversion`/`postversion` hooks above (meant for the local release flow) don't also fire inside CI — the `postversion` `git push` was failing outright on the workflow's detached-HEAD tag checkout, which broke the `v0.1.1` release before it ever reached `npm publish` (nothing was published under that tag; `v0.1.2` is the first release with this fix).
- `docs.yml` no longer triggers on `v*` tags — GitHub Pages' auto-created environment only allows branch deployments by default, so the tag-triggered run failed with an environment-protection error. The `main`-branch trigger alone already covers every release, since a release always lands a commit there too.

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

[Unreleased]: https://github.com/oxth/nestjs-storage/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/oxth/nestjs-storage/compare/v0.1.0...v0.1.2
[0.1.0]: https://github.com/oxth/nestjs-storage/releases/tag/v0.1.0
