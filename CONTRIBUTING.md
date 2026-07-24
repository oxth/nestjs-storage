# Contributing to @oxth/nestjs-storage

Thanks for your interest in contributing! This guide covers setup, workflow, and what's expected of a pull request.

## Development Setup

1. **Fork the repository** (or clone directly if you have write access)
2. **Install dependencies:**
   ```bash
   pnpm install
   ```
3. **Verify tests pass:**
   ```bash
   pnpm test
   ```
4. **Verify the build succeeds:**
   ```bash
   pnpm build
   ```

Requires **Node 24+** — the naming strategies use `node:crypto`'s `randomUUIDv7`, which isn't available on older Node versions. Check with:
```bash
node -e "console.log(typeof require('node:crypto').randomUUIDv7)"
```
This should print `function`. The repo is developed against pnpm; `pnpm-lock.yaml` is committed.

## Project Structure

```
src/
  constants.ts        DI token(s)
  storage.module.ts    StorageModule.forRoot/forRootAsync
  storage.service.ts   StorageService — the public API, driver resolution
  decorators/          @UploadedFileFields
  drivers/             LocalDriver, S3Driver, R2Driver (flydrive wrappers)
  guards/              LocalSignedUrlGuard
  helpers/             generateFileName, verifySignedUrl
  interceptors/        The 4 Storage*Interceptor factories
  interfaces/          Public types (StorageModuleOptions, disk configs, ...)
  middleware/          LocalSignedUrlMiddleware
  strategies/          Naming strategies (Uuid, Hash, Original, DatePath)
  index.ts             Public entry point — re-exports everything above
```

## Development Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes
3. Add or update tests — coverage is enforced at 100%, see [Testing](#testing)
4. Run the full check before pushing:
   ```bash
   pnpm test:cov && pnpm lint && pnpm build
   ```
5. Commit with a descriptive message (see [Commit Messages](#commit-messages))
6. Push and open a pull request

## Code Guidelines

- TypeScript with strict typing, enforced by ESLint + Prettier (`pnpm lint`, `pnpm format`)
- All new or changed behavior must include tests, including error paths — not just the happy path
- All public API must be exported from `src/index.ts` (via the relevant barrel `index.ts` under `src/`)
- Driver wrappers implement flydrive's `DriverContract`, not a bespoke interface — see `src/drivers/s3.driver.ts` / `r2.driver.ts` / `local.driver.ts`
- Never add a static top-level import for a third-party SDK (`@aws-sdk/*`, `@google-cloud/storage`, ...) — see [Adding a New Driver](#adding-a-new-driver)

## Adding a New Driver

1. Add its options type to `src/interfaces/storage-module-options.ts` (`DiskOptions`, `StorageDriver` union).
2. If it needs custom behavior beyond what flydrive provides out of the box, add a thin wrapper class under `src/drivers/`, following `s3.driver.ts` / `r2.driver.ts`.
3. Register it in `StorageService.getAvailableDrivers()` (`src/storage.service.ts`) — **as a lazy, conditional `import()`** inside an `if (usedDrivers.has('yourDriver'))` branch, exactly like the existing `s3`/`r2`/`gcs` entries. Do not statically import anything that pulls in a third-party SDK; see [Build Pipeline](#build-pipeline) for why this matters.
4. If it needs a third-party SDK, add it to `peerDependencies` + `peerDependenciesMeta` (`optional: true`) in `package.json`, and to `devDependencies` too so it's installed for this repo's own tests/build.
5. Export any new public classes/types from the relevant barrel `index.ts`.
6. Document the driver's config shape and setup notes in `README.md` under "Disks and drivers".
7. Add tests: construction-only coverage in `storage.service.spec.ts`'s "remote driver wiring" describe block is the minimum; add a dedicated `*.driver.spec.ts` if the driver has custom logic of its own (signed URLs, CDN handling, etc.).

## Adding a Naming Strategy

Naming strategies are just functions (`NamingStrategy` from `src/interfaces/storage.ts`). Add the file under `src/strategies/`, export it from `src/strategies/index.ts`, add a test in `src/strategies/naming-strategies.spec.ts`, and add it to the table in `README.md`.

## Testing

- Unit tests use **Vitest**, not Jest. `describe`/`it`/`expect`/`vi` are global (`test.globals: true` in `vitest.config.ts`) — no imports needed.
- Coverage is enforced at 100% for statements, branches, functions, and lines (`vitest.config.ts` → `coverage.thresholds`). Run `pnpm test:cov` to check. If you hit a branch that's genuinely unreachable through normal usage, treat that as a signal to double-check the code is correct — not a reason to reach for a coverage-ignore comment.
- Mock external modules with `vi.mock()`. Interceptor tests mock `multer` directly (see any `*.interceptor.spec.ts`) rather than driving real multipart parsing.
- `StorageService` in most unit tests is a small object literal implementing just the methods that test needs (`{ getDefaultDisk: vi.fn(), disk: vi.fn(), ... } as unknown as StorageService`). `storage.service.spec.ts` itself is the exception — it exercises a real `local` disk against a temp directory for high-fidelity coverage of the pass-through methods.
- If a scenario needs a file-scoped `vi.mock()` that would otherwise break the rest of that module's tests, split it into its own dedicated spec file rather than adding conditional mocking to a shared one — see `s3.driver.cloudfront-import-failure.spec.ts` and `signed-url.helper.crypto-throw.spec.ts` for the pattern.
- Lazy driver loading (see below) is verified by actually inspecting `require.cache` / import behavior in `storage.service.spec.ts`'s "remote driver wiring" tests, not by mocking the dynamic import away.

## Build Pipeline

`pnpm build` runs three steps, in order — **all three are load-bearing**, not incidental:

```bash
tsup && tsc-alias -p tsconfig.build.json && node scripts/fix-esm-extensions.mjs
```

1. **`tsup`** compiles with `bundle: false` — every source file becomes its own output file (mirroring `src/`), for both CJS (`.js`) and ESM (`.mjs`), plus declaration files.
2. **`tsc-alias`** rewrites this codebase's `src/...`-style baseUrl imports (e.g. `from 'src/interfaces'`) into real relative paths in the compiled output.
3. **`scripts/fix-esm-extensions.mjs`** fixes the ESM output's import/dynamic-import specifiers to point at the real `.mjs` filenames (including directory barrels resolving to `index.mjs`) — Node's ESM resolver, unlike CJS, doesn't guess extensions.

**Why unbundled?** `StorageService` lazily `import()`s the S3/R2/GCS driver modules only for disk types actually present in your config, so `@aws-sdk/client-s3` / `@google-cloud/storage` stay genuinely optional for `local`-only consumers. A single-file bundle defeats this: esbuild only supports code-splitting for ESM, so a bundled CJS build hoists every external `require()` to the top of the file regardless of dynamic import. If you're ever tempted to simplify the build back to a single-file bundle, first re-verify — by building and inspecting `dist/index.js`, not by re-reading the source — that a `local`-only config still never touches those SDKs:

```bash
node -e "
require('reflect-metadata');
const { StorageService } = require('./dist/index.js');
const s = new StorageService({ default: 'local', disks: { local: { driver: 'local', config: { location: '/tmp/x' } } } });
s.init().then(() => {
  console.log('s3 sdk loaded:', Object.keys(require.cache).some(p => p.includes('@aws-sdk/client-s3')));
});
"
```
This should print `false`.

## Commit Messages

This repo doesn't enforce a prefix convention like Conventional Commits. Commits are short, lowercase, imperative descriptions of the change's intent — see `git log` for examples:

```
add unittest
extract signed URL verification into a shared helper
make S3/GCS SDKs truly optional via lazy per-driver loading
```

Explain the *why* in the body when it isn't obvious from the subject.

## Before Opening a Pull Request

- [ ] `pnpm test:cov` passes at 100% coverage
- [ ] `pnpm lint` and `pnpm format` are clean
- [ ] `pnpm build` succeeds — and if you touched driver loading or the build pipeline, you've re-verified the lazy-loading behavior as shown above
- [ ] `README.md` is updated if you changed or added public API
- [ ] New or changed behavior has test coverage, including error paths

## Continuous Integration

Every push to `main` and every pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml): lint, the full test suite with coverage, and the build. A pull request can't be merged with a red check — this is what makes the automated dependency-update PRs (below) safe to land without extra manual verification, and it's what you should expect your own PRs to pass too.

A [scheduled workflow](.github/workflows/dependency-update.yml) runs weekly, bumps `dependencies`/`devDependencies` to latest, and opens a PR with the result — it never pushes to `main` directly. That PR goes through the same CI checks and review as any other.

Publishing to npm ([`.github/workflows/publish.yml`](.github/workflows/publish.yml)) is triggered by pushing a `v*` tag (e.g. `v0.1.0`). The workflow itself sets `package.json`'s `version` to match the tag (`pnpm version --no-git-tag-version`) before publishing — you don't need to bump/commit the version yourself first, just tag and push. Publishing is authenticated via npm's "Trusted Publisher" (OIDC) feature, configured on npmjs.com for this package against this exact repo and workflow file — there is no `NPM_TOKEN` secret. Only maintainers who can push tags can trigger a publish; contributors don't need to do anything to make this work.

## Reporting Issues

Open an issue at https://github.com/oxth/nestjs-storage/issues, including:

- Reproduction steps (a minimal repro repo/snippet if possible)
- Expected vs. actual behavior
- Environment details: Node version, package version, and which driver(s) you're using

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
