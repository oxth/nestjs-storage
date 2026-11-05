# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Security

- Raised the `multer` dependency to `^2.5.0`, which fixes a denial-of-service when a request is torn down while an async `fileFilter` is still pending ([GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m)). This affects every upload interceptor.
- Raised `@nestjs/platform-express` to `^12.3.2`. Express's own ranges already allow the patched `body-parser`, `proxy-addr` and `qs` releases, so a fresh install picks them up; if your lockfile pins older ones, run your package manager's update.

### Documentation

- Redesigned the docs site: new logo, teal theme, IBM Plex Sans / JetBrains Mono, an interactive code sample in the hero, and install + per-driver config sections on the home page.
- Added a "Feature support" table to the Drivers overview showing which drivers support signed download/upload URLs, visibility, and CDN URLs.
- Documented that `getSignedUploadUrl()` throws on the `local` disk, and corrected the R2 page: a `region` you pass is kept (only `visibility` and `supportsACL` are forced).
- Added PNG icons, a `favicon.ico`, and a social preview image, plus a logo header in the README. `pnpm brand:build` regenerates them.
- Fixed the config table on the Drivers overview page, which rendered as plain text.
- Fixed the README logo and the iOS home-screen icon, which `pnpm brand:build` had rendered cropped.
- SEO: every docs page now has its own meta description, canonical URL, and Open Graph / Twitter title, description and URL. Page titles end in "NestJS Storage", and the home page has structured data (JSON-LD) describing the library.
- Clearer npm description and keywords (removed `encryption`, which the package doesn't offer).

## [0.2.0] - 2026-09-08

### Added

- NestJS 12 support.

## [0.1.8] - 2026-08-20

### Changed

- **Breaking:** `StoredFile.originalName` is now `StoredFile.originalname` (lowercase `n`), matching Multer's own `file.originalname` casing.

## [0.1.7] - 2026-08-13

### Changed

- Naming strategies now generate UUID v7 values via the [`uuid`](https://www.npmjs.com/package/uuid) package's `v7()` instead of `node:crypto`'s `randomUUIDv7`. This drops the minimum supported Node version from 24+ to **20+**.
- CI now publishes test coverage (`coverage/lcov.info`) to Codacy via `codacy/codacy-coverage-reporter-action` after `pnpm test:cov`. Requires a `CODACY_PROJECT_TOKEN` repository secret.

## [0.1.6] - 2026-07-27

### Added

- `FileExtensionValidator`, a `@nestjs/common` `FileValidator` for `ParseFilePipe` that rejects uploads whose extension isn't in an allowed list (case-insensitive, leading dot optional). Exported from `src/pipes/`.

## [0.1.5] - 2026-07-26

### Documentation

- Documented `verifySignedUrl` and `LocalDriver` — both were already exported from `@oxth/nestjs-storage` and covered in `llm-full.md`, but missing from the README and docs site. Added a "Verifying signatures outside HTTP controllers" section to the Signed URLs guide and a Helper functions / `LocalDriver` section to the API reference.
- Added `AGENTS.md` (with `CLAUDE.md` importing it) documenting this repo's conventions for AI coding agents.

### Removed

- Removed 12 unused `devDependencies` (`@nestjs/cli`, `@nestjs/schematics`, `ts-loader`, `ts-node`, `tsconfig-paths`, `source-map-support`, `supertest`, `@types/supertest`, `archiver`, `zod`, `@smithy/types`, `@eslint/eslintrc`) and the now-vestigial `nest-cli.json` — leftovers from the initial `nest new` scaffold, never referenced by this package's source, scripts, or config.

### Changed

- Upgraded TypeScript from 5.9 to 6.0. Dropped the deprecated `baseUrl` compiler option (`paths` resolves relative to `tsconfig.json` without it) and added an explicit `rootDir` to keep `dist/` output flat under the new default rootDir behavior.

### Fixed

- Docs site nav no longer shows a hardcoded, stale version (`v0.1.0`) — it now reads `package.json`'s version at build time.
- `docs.yml` now redeploys on a `package.json` change too, since a release only touches that file on `main` and previously wasn't redeploying the docs site at all.

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

[Unreleased]: https://github.com/oxth/nestjs-storage/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/oxth/nestjs-storage/compare/v0.1.8...v0.2.0
[0.1.2]: https://github.com/oxth/nestjs-storage/compare/v0.1.0...v0.1.2
[0.1.0]: https://github.com/oxth/nestjs-storage/releases/tag/v0.1.0
