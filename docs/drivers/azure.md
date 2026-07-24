# Azure Blob Storage

```bash
npm install @azure/storage-blob
```

```ts
disks: {
  azure: {
    driver: 'azure',
    config: {
      containerName: 'my-container',
      accountName: 'mystorageaccount',
      accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
      // or, instead of accountName/accountKey:
      // connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    },
  },
},
```

Exactly one auth method is expected: `accountName` + `accountKey`, **or** `connectionString`.

## Signed URLs require `accountName`/`accountKey`

`getSignedUrl`/`getSignedUploadUrl` generate a SAS token, which requires a `StorageSharedKeyCredential` — built from `accountName`/`accountKey`. A `connectionString`-only config can still read/write files, but calling either signed-URL method rejects with a clear error:

> Signed URLs require the "azure" driver to be configured with accountName/accountKey. A connectionString alone cannot sign a SAS token.

## Visibility

Azure Blob Storage has no per-blob ACL — visibility is a container-level setting. `getVisibility()` just returns whatever `visibility` you configured (default `'private'`); `setVisibility()` is a no-op.

## CDN / custom domain

Set `cdnUrl` to serve public URLs through a CDN or custom domain instead of the storage account's own `*.blob.core.windows.net` endpoint:

```ts
config: {
  containerName: 'my-container',
  accountName: 'mystorageaccount',
  accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
  cdnUrl: 'https://cdn.example.com',
},
```
