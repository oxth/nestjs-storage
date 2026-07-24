# Google Cloud Storage

```bash
npm install @google-cloud/storage
```

```ts
disks: {
  gcs: {
    driver: 'gcs',
    config: { bucket: 'my-bucket' },
  },
},
```

There's no wrapper class for this driver — `StorageService` uses flydrive's `GCSDriver` (`flydrive/drivers/gcs`) directly, constructed with your disk's `config` as-is. See [`@google-cloud/storage`'s own docs](https://www.npmjs.com/package/@google-cloud/storage) for the full set of options accepted (service account credentials, `keyFilename`, `projectId`, etc.) — anything it accepts, you can pass here.
