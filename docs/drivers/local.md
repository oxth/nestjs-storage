# Local Filesystem

```ts
disks: {
  local: {
    driver: 'local',
    config: {
      location: './storage',              // absolute or relative root folder
      url: 'http://localhost:3000/files',  // used to build public URLs
      visibility: 'private',               // default; 'public' also supported
    },
  },
},
```

`location` and `visibility` (plus anything else flydrive's `FSDriver` accepts) come straight from `LocalDriverOptions`. `url` is this package's own addition — it's the base URL used to build `getUrl()`/`getSignedUrl()` results. If you never set it, calling `getUrl()`/`getSignedUrl()` throws (there's no base to build an absolute URL from), so set it whenever you plan to serve files back out.

## Signed URLs

Signed/temporary URLs for the local disk require a top-level `signSecret`:

```ts
StorageModule.forRoot({
  signSecret: process.env.STORAGE_SIGN_SECRET,
  default: 'local',
  disks: { local: { driver: 'local', config: { location: './storage' } } },
});
```

Without `signSecret`, `getSignedUrl()` logs a warning and falls back to an unsigned URL — fine for local development, not for production. See [Signed URLs](/guide/signed-urls) for enforcing them on incoming requests with the guard/middleware.

## No third-party SDK required

`local` only depends on flydrive's `FSDriver`, which is a regular (not optional) dependency of this package — nothing extra to install.
