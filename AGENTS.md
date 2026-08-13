# @oxth/nestjs-storage Development Guide

This is `@oxth/nestjs-storage` — a NestJS module giving a single, unified `StorageService` API over Local filesystem, S3, Cloudflare R2, Google Cloud Storage, Azure Blob Storage, and any S3-compatible service, built on top of [flydrive](https://flydrive.dev/).

## Project Structure

- `src/storage.module.ts` - `StorageModule.forRoot`/`forRootAsync`, marked `@Global()`
- `src/storage.service.ts` - `StorageService`, the public API and lazy driver resolution
- `src/drivers/` - `LocalDriver`, `S3Driver`, `R2Driver` — thin flydrive `DriverContract` wrappers
- `src/interceptors/` - The 4 `Storage*Interceptor` factories (single file / array / fields / fields-array)
- `src/guards/`, `src/middleware/` - `LocalSignedUrlGuard` / `LocalSignedUrlMiddleware`
- `src/strategies/` - Naming strategies (Uuid, Hash, Original, DatePath — all just functions)
- `src/helpers/` - `generateFileName`, `verifySignedUrl`
- `src/interfaces/` - Public types (`StorageModuleOptions`, disk configs, `StoredFile`, ...)
- `src/index.ts` - Public entry point; every public symbol must be re-exported from here (via the relevant barrel `index.ts`)
- `docs/` - VitePress documentation site, content lives directly under `docs/` (not `docs/content/`)
- `llm.md` / `llm-full.md` - Condensed / exhaustive API reference kept in sync with README for AI consumers of the *published package* — distinct from this file, which is for agents working on the package's own source

## Commands

- ALWAYS use `pnpm` (never npm or yarn)
- Test: `pnpm test` (Vitest, runs fast) — for a single file: `vitest run path/to/file.spec.ts`
- Coverage (enforced at 100% statements/branches/functions/lines): `pnpm test:cov`
- Lint: `pnpm lint` (auto-fixes) · Format: `pnpm format`
- Build: `pnpm build` — runs `tsup && tsc-alias && fix-esm-extensions.mjs`, see [Build Pipeline](#build-pipeline)
- Docs preview: `pnpm docs:dev`

## Writing Code

- TypeScript, strict typing, enforced by ESLint + Prettier — single quotes, trailing commas (`.prettierrc`)
- Node 20+; naming strategies use the `uuid` package's `v7()` for UUID v7 generation
- Never add a static top-level import for a third-party SDK (`@aws-sdk/*`, `@google-cloud/storage`, `@azure/storage-blob`). These must stay optional peer dependencies for `local`-only consumers — see [Build Pipeline](#build-pipeline)
- Driver wrappers implement flydrive's `DriverContract`, not a bespoke interface
- All public API must be exported from `src/index.ts` via the relevant barrel `src/*/index.ts`
- Prefer `Uint8Array`/`Readable` over Node `Buffer` where the existing API already does (see `StorageService.getBytes`/`getStream`)

## Testing

- Vitest, not Jest — `describe`/`it`/`expect`/`vi` are globals, no imports needed
- Coverage is enforced at 100% (`vitest.config.ts` → `coverage.thresholds`). A branch that seems genuinely unreachable is a signal to double-check the code, not a reason to reach for a coverage-ignore comment
- Mock external modules with `vi.mock()`; interceptor tests mock `multer` directly rather than driving real multipart parsing
- `StorageService` in most unit tests is a small object literal implementing only the methods that test needs, cast `as unknown as StorageService`. `storage.service.spec.ts` itself is the exception — it exercises a real `local` disk against a temp directory
- If a scenario needs a file-scoped `vi.mock()` that would break the rest of that module's tests, split it into its own dedicated spec file instead of adding conditional mocking to a shared one (see `s3.driver.cloudfront-import-failure.spec.ts`, `signed-url.helper.crypto-throw.spec.ts`)
- Lazy driver loading is verified by actually inspecting import/`require.cache` behavior in `storage.service.spec.ts`'s "remote driver wiring" tests, not by mocking the dynamic import away

## Adding a New Driver

1. Add its options type to `src/interfaces/storage-module-options.ts` (`DiskOptions`, `StorageDriver` union)
2. If it needs behavior beyond what flydrive provides out of the box, add a thin wrapper under `src/drivers/`, following `s3.driver.ts` / `r2.driver.ts`
3. Register it in `StorageService.getAvailableDrivers()` as a lazy, conditional `import()` inside an `if (usedDrivers.has('yourDriver'))` branch — exactly like the existing `s3`/`r2`/`gcs` entries
4. Add the SDK to `peerDependencies` + `peerDependenciesMeta` (`optional: true`), and to `devDependencies` so this repo's own tests/build can use it
5. Export new public classes/types from the relevant barrel `index.ts`
6. Document the config shape in `README.md` under "Disks and drivers"
7. Add tests: construction-only coverage in `storage.service.spec.ts`'s "remote driver wiring" block is the minimum; add a dedicated `*.driver.spec.ts` for custom logic (signed URLs, CDN handling, etc.)

## Build Pipeline

`pnpm build` runs three load-bearing steps in order: `tsup` (unbundled — every source file becomes its own CJS + ESM output file) → `tsc-alias` (rewrites `src/...` baseUrl imports to relative paths) → `scripts/fix-esm-extensions.mjs` (fixes ESM import specifiers to real `.mjs` filenames, since Node's ESM resolver doesn't guess extensions).

**Why unbundled?** `StorageService` lazily `import()`s the S3/R2/GCS driver modules only for disk types actually present in config, so their SDKs stay genuinely optional for `local`-only consumers. A single-file bundle defeats this — esbuild only code-splits for ESM, so a bundled CJS build would hoist every external `require()` to the top regardless of dynamic import. If you touch driver loading or the build pipeline, re-verify this by building and inspecting `dist/index.js` (not by re-reading the source) — see `CONTRIBUTING.md` → "Build Pipeline" for the exact verification snippet. It should show the S3 SDK is *not* in `require.cache` for a `local`-only config.

## Important Development Notes

- Bug fixes and new features MUST include tests, including error paths, not just the happy path
- Coverage must stay at 100% — run `pnpm test:cov` before finishing, not just `pnpm test`
- Update `README.md` when changing or adding public API; update `docs/` (VitePress) sidebar in `docs/.vitepress/config.mts` when adding/renaming a doc page
- Add a `CHANGELOG.md` entry under `[Unreleased]` for any user-facing change
- Ensure `pnpm lint`, `pnpm test:cov`, and `pnpm build` all pass before finishing — this is exactly what CI (`.github/workflows/ci.yml`) checks
- DO NOT COMMIT unless the user explicitly asks
- Commit messages: short, lowercase, imperative (`add unittest`, `extract signed URL verification into a shared helper`) — no Conventional Commits prefix convention; see `git log` for examples
- PRs target `main`
- See `CONTRIBUTING.md` for the full contributor workflow (release process, CI/Dependabot/publish details) and `README.md` for the complete public API surface
