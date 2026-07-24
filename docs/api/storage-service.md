# StorageService

`StorageService` mirrors flydrive's `Disk` API. Every method operates on the default disk unless you call `.disk(name)` first.

::: tip
`StorageModule` handles this for you, but if you ever construct `StorageService` directly (e.g. outside of Nest DI, in a script) call `await service.init()` once before using it — that's the step that lazily resolves the driver(s) your config actually needs.
:::

## Disk access

| Method | Description |
| --- | --- |
| `disk(name?)` | Get the underlying flydrive `Disk` for a given (or default) disk. |
| `file(key)` / `fromSnapshot(snapshot)` | Get a lazy `DriveFile` pointer, optionally rehydrated from a persisted snapshot. |

## Reading

| Method | Description |
| --- | --- |
| `exists(key)` | Whether a file exists. |
| `get(key)` / `getBytes(key)` / `getStream(key)` | Read contents as a string, `Uint8Array`, or `Readable`. |
| `getMetaData(key)` | Content length, content type, etag, last modified. |
| `getVisibility(key)` | `'public'` or `'private'`. |

## URLs

| Method | Description |
| --- | --- |
| `getUrl(key)` | Public URL for the file. |
| `getSignedUrl(key, options?)` | Temporary signed URL (download). |
| `getSignedUploadUrl(key, options?)` | Temporary signed URL for direct upload. |

## Writing

| Method | Description |
| --- | --- |
| `setVisibility(key, visibility)` | Update `'public'` \| `'private'`. |
| `put(key, contents, options?)` / `putStream(key, contents, options?)` | Write a file from a string/buffer or a stream. |
| `copy(src, dest, options?)` / `move(src, dest, options?)` | Copy/move within the same disk. |
| `copyFromFs(fsPath, dest, options?)` / `moveFromFs(fsPath, dest, options?)` | Import a file from the local filesystem into any disk. |
| `delete(key)` / `deleteAll(prefix?)` | Delete one file, or everything under a prefix. |
| `listAll(prefix?, options?)` | Paginated listing of files and directories. |

## Configuration introspection

| Method | Description |
| --- | --- |
| `getDefaultDisk()` | The configured default disk name. |
| `getSignSecret()` | The configured `signSecret`, if any. |
| `getNamingStrategy(diskName?)` | The resolved naming strategy for a disk (falls back to `UuidNamingStrategy`). |

## Testing

| Method | Description |
| --- | --- |
| `fake(diskName?)` | Swap a disk for a real-filesystem-backed fake — see [Testing](/guide/testing). |
| `restore(diskName?)` | Swap it back. |
