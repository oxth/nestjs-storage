# Signed URLs

The `local` driver can hand out HMAC-signed, expiring URLs once `signSecret` is set on the module (see [Configuration](/guide/configuration#signed-urls)). Protect the route that serves those files with either the guard or the middleware — both share the same verification logic, so pick whichever fits your app.

## Guard

Rejects with a NestJS `ForbiddenException` on failure:

```ts
import { UseGuards, Get } from '@nestjs/common';
import { LocalSignedUrlGuard } from '@oxth/nestjs-storage';

@UseGuards(LocalSignedUrlGuard)
@Get('files/*path')
serve() {
  /* ... */
}
```

## Middleware

Writes a plain `{ message }` 403 response itself, instead of throwing:

```ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LocalSignedUrlMiddleware } from '@oxth/nestjs-storage';

@Module({ /* ... */ })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LocalSignedUrlMiddleware).forRoutes('files');
  }
}
```

## Generating the signed URL

```ts
const url = await storage.getSignedUrl(key, { expiresIn: '10mins' });
```

This appends `expires` and `signature` query parameters that the guard/middleware verify on the way in. Verification fails with one of three reasons:

- **Missing signature parameters** — `expires` or `signature` absent from the query string
- **URL has expired** — `expires` isn't a valid integer, or it's in the past
- **Invalid signature** — the recomputed HMAC-SHA256 signature doesn't match (or the provided signature isn't valid hex)

Without a configured `signSecret`, `getSignedUrl()` on the local disk logs a warning and falls back to an **unsigned** URL — fine for local development, not for production.

## Verifying signatures outside HTTP controllers

The guard and middleware both call the same exported function under the hood — `verifySignedUrl(req, signSecret)` from `@oxth/nestjs-storage`. Reuse it directly wherever `LocalSignedUrlGuard`/`LocalSignedUrlMiddleware` don't fit, e.g. a GraphQL resolver, a WebSocket gateway, or a custom controller that needs a different failure response:

```ts
import { verifySignedUrl } from '@oxth/nestjs-storage';

const result = verifySignedUrl(request, signSecret);
if (!result.valid) {
  // result.reason: 'Missing signature parameters' | 'URL has expired' | 'Invalid signature'
  throw new Error(result.reason);
}
```

`req` only needs `query`, `originalUrl`, `protocol`, and `host` — any object shaped like an Express `Request` (or a subset built from another transport) works.
