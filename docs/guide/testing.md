# Testing

`StorageService.fake(diskName?)` swaps a disk for a real-filesystem-backed fake (under a temp directory by default, or wherever you configure via `fakes.location`), so your tests never touch production storage:

```ts
const fake = storage.fake('local');

await yourService.uploadAvatar(file);

fake.assertExists('avatars/photo.png');
storage.restore('local'); // back to the real disk
```

While a disk is faked, every `StorageService` call for that disk name (`.put`, `.get`, `.disk('local')`, ...) transparently uses the fake instead — no code changes needed in the code under test.

## `FakeDisk` API

```ts
interface FakeDisk extends Disk {
  assertExists(paths: string | string[]): void; // throws if any path is missing
  assertMissing(paths: string | string[]): void; // throws if any path exists
  clear(): void; // wipe the fake's backing storage
}
```

## Custom fakes location

```ts
StorageModule.forRoot({
  default: 'local',
  disks: { local: { driver: 'local', config: { location: './storage' } } },
  fakes: { location: '/tmp/my-app-fakes' },
});
```

## Constructing `StorageService` outside of Nest DI

`StorageModule` calls `service.init()` for you before handing the instance to Nest's DI container. If you ever construct `StorageService` directly — in a standalone script, for example — call `await service.init()` yourself first; that's the step that lazily resolves the driver(s) your config actually needs.

```ts
const service = new StorageService(options);
await service.init();
```
