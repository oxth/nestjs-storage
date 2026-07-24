import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
  type ContainerClient,
} from '@azure/storage-blob';
import { DriveDirectory, DriveFile } from 'flydrive';
import type {
  DriverContract,
  ObjectMetaData,
  ObjectVisibility,
  SignedURLOptions,
  WriteOptions,
} from 'flydrive/types';
import string from '@poppinss/string';
import type { Readable } from 'node:stream';
import { AzureDriverOptions } from 'src/interfaces';

export class AzureDriver implements DriverContract {
  private readonly containerClient: ContainerClient;
  private readonly sharedKeyCredential?: StorageSharedKeyCredential;
  private readonly visibility: ObjectVisibility;
  private readonly cdnUrl?: string;

  constructor(private readonly options: AzureDriverOptions) {
    this.visibility = options.visibility ?? 'private';
    this.cdnUrl = options.cdnUrl;

    let client: BlobServiceClient;
    if (options.connectionString !== undefined) {
      client = BlobServiceClient.fromConnectionString(options.connectionString);
    } else {
      this.sharedKeyCredential = new StorageSharedKeyCredential(
        options.accountName,
        options.accountKey,
      );
      client = new BlobServiceClient(
        `https://${options.accountName}.blob.core.windows.net`,
        this.sharedKeyCredential,
      );
    }

    this.containerClient = client.getContainerClient(options.containerName);
  }

  private blockBlobClient(key: string) {
    return this.containerClient.getBlockBlobClient(key);
  }

  private ensureSharedKeyCredential(): StorageSharedKeyCredential {
    if (!this.sharedKeyCredential) {
      throw new Error(
        'Signed URLs require the "azure" driver to be configured with accountName/accountKey. A connectionString alone cannot sign a SAS token.',
      );
    }
    return this.sharedKeyCredential;
  }

  // async here (with no literal await) so ensureSharedKeyCredential()'s throw
  // becomes a rejected promise, matching DriverContract's async signatures,
  // rather than a synchronous throw that callers using .catch() instead of
  // try/await wouldn't see.
  // eslint-disable-next-line @typescript-eslint/require-await
  private async generateSas(
    key: string,
    permissions: string,
    options?: SignedURLOptions,
  ): Promise<string> {
    const credential = this.ensureSharedKeyCredential();
    const expires = string.seconds.parse(options?.expiresIn || '30mins');

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.options.containerName,
        blobName: key,
        permissions: BlobSASPermissions.parse(permissions),
        expiresOn: new Date(Date.now() + expires * 1000),
        contentType: options?.contentType,
        contentDisposition: options?.contentDisposition,
      },
      credential,
    ).toString();

    return `${this.blockBlobClient(key).url}?${sas}`;
  }

  async exists(key: string): Promise<boolean> {
    return this.blockBlobClient(key).exists();
  }

  async get(key: string): Promise<string> {
    const buffer = await this.blockBlobClient(key).downloadToBuffer();
    return buffer.toString('utf-8');
  }

  async getBytes(key: string): Promise<Uint8Array> {
    return this.blockBlobClient(key).downloadToBuffer();
  }

  async getStream(key: string): Promise<Readable> {
    const response = await this.blockBlobClient(key).download();
    return response.readableStreamBody as unknown as Readable;
  }

  async getMetaData(key: string): Promise<ObjectMetaData> {
    const props = await this.blockBlobClient(key).getProperties();
    return {
      contentType: props.contentType,
      contentLength: props.contentLength ?? 0,
      etag: props.etag ?? '',
      lastModified: props.lastModified ?? new Date(),
    };
  }

  getVisibility(): Promise<ObjectVisibility> {
    return Promise.resolve(this.visibility);
  }

  /**
   * Azure Blob Storage has no per-blob ACL; visibility is a container-level
   * setting. No-op, consistent with drivers where per-object visibility
   * isn't a real concept (e.g. the local disk).
   */
  async setVisibility(): Promise<void> {}

  getUrl(key: string): Promise<string> {
    if (this.cdnUrl) {
      return Promise.resolve(new URL(key, this.cdnUrl).toString());
    }
    return Promise.resolve(this.blockBlobClient(key).url);
  }

  getSignedUrl(key: string, options?: SignedURLOptions): Promise<string> {
    return this.generateSas(key, 'r', options);
  }

  getSignedUploadUrl(key: string, options?: SignedURLOptions): Promise<string> {
    return this.generateSas(key, 'cw', options);
  }

  async put(
    key: string,
    contents: string | Uint8Array,
    options?: WriteOptions,
  ): Promise<void> {
    const buffer = Buffer.from(contents);
    await this.blockBlobClient(key).uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: options?.contentType,
        blobContentEncoding: options?.contentEncoding,
        blobContentLanguage: options?.contentLanguage,
        blobContentDisposition: options?.contentDisposition,
        blobCacheControl: options?.cacheControl,
      },
    });
  }

  async putStream(
    key: string,
    contents: Readable,
    options?: WriteOptions,
  ): Promise<void> {
    await this.blockBlobClient(key).uploadStream(
      contents,
      undefined,
      undefined,
      {
        blobHTTPHeaders: {
          blobContentType: options?.contentType,
          blobContentEncoding: options?.contentEncoding,
          blobContentLanguage: options?.contentLanguage,
          blobContentDisposition: options?.contentDisposition,
          blobCacheControl: options?.cacheControl,
        },
      },
    );
  }

  async copy(source: string, destination: string): Promise<void> {
    const sourceUrl = this.blockBlobClient(source).url;
    await this.blockBlobClient(destination).syncCopyFromURL(sourceUrl);
  }

  async move(source: string, destination: string): Promise<void> {
    await this.copy(source, destination);
    await this.delete(source);
  }

  async delete(key: string): Promise<void> {
    await this.blockBlobClient(key).deleteIfExists();
  }

  async deleteAll(prefix: string): Promise<void> {
    const normalizedPrefix = prefix === '/' ? '' : prefix;
    for await (const blob of this.containerClient.listBlobsFlat({
      prefix: normalizedPrefix,
    })) {
      await this.blockBlobClient(blob.name).deleteIfExists();
    }
  }

  async listAll(
    prefix: string,
    options?: { recursive?: boolean; paginationToken?: string },
  ): Promise<{
    paginationToken?: string;
    objects: Iterable<DriveFile | DriveDirectory>;
  }> {
    const normalizedPrefix = prefix === '/' ? '' : prefix;

    if (options?.recursive) {
      const page = (
        await this.containerClient
          .listBlobsFlat({ prefix: normalizedPrefix })
          .byPage({ continuationToken: options?.paginationToken })
          .next()
      ).value;

      return {
        paginationToken: page?.continuationToken || undefined,
        objects: (page?.segment.blobItems ?? []).map(
          (blob) => new DriveFile(blob.name, this),
        ),
      };
    }

    const page = (
      await this.containerClient
        .listBlobsByHierarchy('/', { prefix: normalizedPrefix })
        .byPage({ continuationToken: options?.paginationToken })
        .next()
    ).value;

    const objects: (DriveFile | DriveDirectory)[] = [
      ...(page?.segment.blobItems ?? []).map(
        (blob) => new DriveFile(blob.name, this),
      ),
      ...(page?.segment.blobPrefixes ?? []).map(
        (dir) => new DriveDirectory(dir.name),
      ),
    ];

    return {
      paginationToken: page?.continuationToken || undefined,
      objects,
    };
  }

  bucket(containerName: string): AzureDriver {
    return new AzureDriver({ ...this.options, containerName });
  }
}
