# Naming Strategies

A naming strategy decides the stored file name/key from the uploaded file's contents and original name:

```ts
type NamingStrategy = (
  file: Uint8Array,
  originalName: string,
) => string | Promise<string>;
```

## Built in

| Strategy | Produces |
| --- | --- |
| `UuidNamingStrategy` (default) | `<uuid-v7><ext>` |
| `OriginalNamingStrategy` | the original file name, unchanged |
| `HashNamingStrategy` | `<sha256-of-contents><ext>` — natural de-duplication |
| `DatePathNamingStrategy` | `<yyyy>/<mm>/<dd>/<original-name-without-ext><ext>` |
| `DatePathUuidNamingStrategy` | `<yyyy>/<mm>/<dd>/<uuid-v7><ext>` |

Date components use the local system clock at call time, zero-padded to 2 digits for month/day.

## Setting a strategy

Set one per disk:

```ts
disks: {
  local: {
    driver: 'local',
    config: { location: './storage' },
    namingStrategy: HashNamingStrategy,
  },
},
```

Or override it per upload (see [File Uploads](/guide/file-uploads#per-upload-options)):

```ts
StorageFileInterceptor('avatar', { namingStrategy: HashNamingStrategy });
```

## Writing your own

A naming strategy is just a function — synchronous or async:

```ts
import { NamingStrategy } from '@oxth/nestjs-storage';

export const SlugNamingStrategy: NamingStrategy = (file, originalName) => {
  return `${slugify(originalName)}-${Date.now()}`;
};
```
