# Configuration

## Async configuration

Use `forRootAsync` when your disk config depends on other providers (e.g. a `ConfigService`):

```ts
StorageModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    default: 's3',
    disks: {
      s3: {
        driver: 's3',
        config: {
          bucket: config.get('S3_BUCKET'),
          region: config.get('S3_REGION'),
          credentials: {
            accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
          },
        },
      },
    },
  }),
});
```

You can also provide a class implementing `StorageOptionsFactory`:

```ts
@Injectable()
class StorageConfigService implements StorageOptionsFactory {
  createStorageOptions(): StorageModuleOptions {
    return {
      /* ... */
    };
  }
}

StorageModule.forRootAsync({ useClass: StorageConfigService });
```

## Multiple disks

Configure as many disks as you need and pick one per call:

```ts
StorageModule.forRoot({
  default: 'local',
  disks: {
    local: { driver: 'local', config: { location: './storage' } },
    s3: {
      driver: 's3',
      config: {
        bucket: 'backups',
        region: 'us-east-1',
        credentials: { accessKeyId: '...', secretAccessKey: '...' },
      },
    },
  },
});

await storage.disk('s3').put('backup.zip', buffer);
await storage.disk().put('avatar.png', buffer); // uses the default disk
```

See [Drivers](/drivers/) for the config shape of each built-in driver, and [Custom Drivers](/drivers/custom-drivers) for registering your own.

## Signed URLs

Set `signSecret` at the top level to enable HMAC-signed, expiring URLs for the `local` disk:

```ts
StorageModule.forRoot({
  signSecret: process.env.STORAGE_SIGN_SECRET,
  default: 'local',
  disks: { local: { driver: 'local', config: { location: './storage' } } },
});
```

See [Signed URLs](/guide/signed-urls) for how to enforce them on incoming requests.
