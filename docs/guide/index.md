# Getting Started

`@oxth/nestjs-storage` gives you one `StorageService` API regardless of which storage backend(s) you configure — local filesystem, S3, Cloudflare R2, Google Cloud Storage, Azure Blob Storage, or any S3-compatible service.

- One `StorageService` API regardless of which disk(s) you configure
- Multiple named disks in the same app, with a configurable default
- Multer-based upload interceptors that stream files straight to a disk
- Pluggable file naming strategies (UUID, hash, original name, date path)
- Signed URLs for the local disk, enforced via a `Guard` or a `Middleware`
- A built-in fake disk for tests, backed by the real filesystem

Not installed yet? See the [Installation](/guide/installation) page for peer dependency details.

## Register the module

```ts
import { Module } from '@nestjs/common';
import { StorageModule } from '@oxth/nestjs-storage';

@Module({
  imports: [
    StorageModule.forRoot({
      default: 'local',
      disks: {
        local: {
          driver: 'local',
          config: {
            location: './storage',
            url: 'http://localhost:3000/files',
          },
        },
      },
    }),
  ],
})
export class AppModule {}
```

`StorageModule` is `@Global()`, so `StorageService` is available for injection anywhere in your app once it's imported in your root module.

## Use it in a service

```ts
import { Injectable } from '@nestjs/common';
import { StorageService } from '@oxth/nestjs-storage';

@Injectable()
export class AvatarsService {
  constructor(private readonly storage: StorageService) {}

  async save(key: string, contents: Buffer) {
    await this.storage.put(key, contents);
    return this.storage.getUrl(key);
  }
}
```

## Where to go next

- [Installation](/guide/installation) — peer dependencies and what's optional
- [Configuration](/guide/configuration) — `forRootAsync`, multiple disks, custom drivers
- [Drivers](/drivers/) — config shape for each storage backend
- [File Uploads](/guide/file-uploads) — the four upload interceptors
- [API Reference](/api/) — the full `StorageService` method list
