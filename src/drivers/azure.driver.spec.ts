import type { Readable } from 'node:stream';
import { AzureDriver } from './azure.driver';
import type { AzureDriverOptions } from 'src/interfaces';

const exists = vi.fn();
const downloadToBuffer = vi.fn();
const download = vi.fn();
const getProperties = vi.fn();
const uploadData = vi.fn();
const uploadStream = vi.fn();
const syncCopyFromURL = vi.fn();
const deleteIfExists = vi.fn();
const listBlobsFlat = vi.fn();
const listBlobsByHierarchy = vi.fn();
const getContainerClientMock = vi.fn();
const fromConnectionStringMock = vi.fn();
const generateBlobSASQueryParametersMock = vi.fn();
const blobSASPermissionsParseMock = vi.fn();

function getBlockBlobClient(key: string) {
  return {
    exists,
    downloadToBuffer,
    download,
    getProperties,
    uploadData,
    uploadStream,
    syncCopyFromURL,
    deleteIfExists,
    url: `https://mockaccount.blob.core.windows.net/mockcontainer/${key}`,
  };
}

vi.mock('@azure/storage-blob', () => {
  class BlobServiceClient {
    static fromConnectionString(connectionString: string) {
      fromConnectionStringMock(connectionString);
      return { getContainerClient: getContainerClientMock };
    }

    constructor(
      public url: string,
      public credential: unknown,
    ) {}

    getContainerClient = getContainerClientMock;
  }

  class StorageSharedKeyCredential {
    constructor(
      public accountName: string,
      public accountKey: string,
    ) {}
  }

  class BlobSASPermissions {
    static parse(permissions: string) {
      blobSASPermissionsParseMock(permissions);
      return { permissions };
    }
  }

  return {
    BlobServiceClient,
    StorageSharedKeyCredential,
    BlobSASPermissions,
    generateBlobSASQueryParameters: (...args: unknown[]) =>
      generateBlobSASQueryParametersMock(...args),
  };
});

function buildFlatPage(names: string[], continuationToken?: string) {
  return {
    segment: { blobItems: names.map((name) => ({ name })) },
    continuationToken,
  };
}

function buildHierarchyPage(
  blobNames: string[],
  prefixNames: string[],
  continuationToken?: string,
) {
  return {
    segment: {
      blobItems: blobNames.map((name) => ({ name })),
      blobPrefixes: prefixNames.map((name) => ({ name })),
    },
    continuationToken,
  };
}

function buildPagedIterable(
  items: { name: string }[],
  page: unknown,
): AsyncIterable<{ name: string }> & { byPage: (opts?: unknown) => any } {
  return {
    [Symbol.asyncIterator]: () => {
      let index = 0;
      return {
        next: async () =>
          index < items.length
            ? { value: items[index++], done: false }
            : { value: undefined, done: true },
      };
    },
    byPage: () => ({
      next: async () => ({ value: page, done: false }),
    }),
  };
}

function buildDriver(
  overrides: Partial<AzureDriverOptions> = {},
): InstanceType<typeof AzureDriver> {
  return new AzureDriver({
    containerName: 'mockcontainer',
    accountName: 'mockaccount',
    accountKey: 'mockkey',
    ...overrides,
  } as AzureDriverOptions);
}

beforeEach(() => {
  vi.clearAllMocks();
  getContainerClientMock.mockReturnValue({
    getBlockBlobClient,
    listBlobsFlat,
    listBlobsByHierarchy,
  });
});

describe('AzureDriver construction', () => {
  it('builds a client from accountName/accountKey via StorageSharedKeyCredential', () => {
    buildDriver({ accountName: 'acc', accountKey: 'key' } as any);
    expect(getContainerClientMock).toHaveBeenCalledWith('mockcontainer');
  });

  it('builds a client from a connectionString', () => {
    buildDriver({
      connectionString: 'connstr',
      accountName: undefined,
      accountKey: undefined,
    } as any);
    expect(fromConnectionStringMock).toHaveBeenCalledWith('connstr');
  });
});

describe('AzureDriver', () => {
  it('exists() delegates to the block blob client', async () => {
    exists.mockResolvedValue(true);
    const driver = buildDriver();
    await expect(driver.exists('a.txt')).resolves.toBe(true);
  });

  it('get() downloads and decodes as utf-8', async () => {
    downloadToBuffer.mockResolvedValue(Buffer.from('hello'));
    const driver = buildDriver();
    await expect(driver.get('a.txt')).resolves.toBe('hello');
  });

  it('getBytes() returns the raw buffer', async () => {
    const buffer = Buffer.from('hello');
    downloadToBuffer.mockResolvedValue(buffer);
    const driver = buildDriver();
    await expect(driver.getBytes('a.txt')).resolves.toBe(buffer);
  });

  it('getStream() returns the readable stream body', async () => {
    const stream = { pipe: vi.fn() } as unknown as Readable;
    download.mockResolvedValue({ readableStreamBody: stream });
    const driver = buildDriver();
    await expect(driver.getStream('a.txt')).resolves.toBe(stream);
  });

  it('getMetaData() maps properties, defaulting missing fields', async () => {
    getProperties.mockResolvedValue({
      contentType: 'text/plain',
      contentLength: 5,
      etag: 'abc',
      lastModified: undefined,
    });
    const driver = buildDriver();
    const meta = await driver.getMetaData('a.txt');
    expect(meta.contentType).toBe('text/plain');
    expect(meta.contentLength).toBe(5);
    expect(meta.etag).toBe('abc');
    expect(meta.lastModified).toBeInstanceOf(Date);
  });

  it('getMetaData() defaults contentLength/etag when absent', async () => {
    getProperties.mockResolvedValue({});
    const driver = buildDriver();
    const meta = await driver.getMetaData('a.txt');
    expect(meta.contentLength).toBe(0);
    expect(meta.etag).toBe('');
  });

  it('getVisibility() returns the configured visibility (default private)', async () => {
    const driver = buildDriver();
    await expect(driver.getVisibility()).resolves.toBe('private');
  });

  it('getVisibility() honors an explicit visibility', async () => {
    const driver = buildDriver({ visibility: 'public' } as any);
    await expect(driver.getVisibility()).resolves.toBe('public');
  });

  it('setVisibility() is a no-op', async () => {
    const driver = buildDriver();
    await expect(driver.setVisibility()).resolves.toBeUndefined();
  });

  it('getUrl() returns the blob client url when no cdnUrl is configured', async () => {
    const driver = buildDriver();
    await expect(driver.getUrl('a.txt')).resolves.toBe(
      'https://mockaccount.blob.core.windows.net/mockcontainer/a.txt',
    );
  });

  it('getUrl() uses cdnUrl when configured', async () => {
    const driver = buildDriver({ cdnUrl: 'https://cdn.example.com' } as any);
    await expect(driver.getUrl('a.txt')).resolves.toBe(
      'https://cdn.example.com/a.txt',
    );
  });

  it('getSignedUrl() signs with read permission using the shared key credential', async () => {
    generateBlobSASQueryParametersMock.mockReturnValue({
      toString: () => 'sig=read',
    });
    const driver = buildDriver();

    const url = await driver.getSignedUrl('a.txt', { expiresIn: '10mins' });

    expect(blobSASPermissionsParseMock).toHaveBeenCalledWith('r');
    expect(generateBlobSASQueryParametersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        containerName: 'mockcontainer',
        blobName: 'a.txt',
      }),
      expect.any(Object),
    );
    expect(url).toBe(
      'https://mockaccount.blob.core.windows.net/mockcontainer/a.txt?sig=read',
    );
  });

  it('getSignedUploadUrl() signs with create+write permission', async () => {
    generateBlobSASQueryParametersMock.mockReturnValue({
      toString: () => 'sig=write',
    });
    const driver = buildDriver();

    await driver.getSignedUploadUrl('a.txt');

    expect(blobSASPermissionsParseMock).toHaveBeenCalledWith('cw');
  });

  it('getSignedUrl() throws when only a connectionString was configured', async () => {
    const driver = buildDriver({
      connectionString: 'connstr',
      accountName: undefined,
      accountKey: undefined,
    } as any);

    await expect(driver.getSignedUrl('a.txt')).rejects.toThrow(
      'Signed URLs require the "azure" driver to be configured with accountName/accountKey',
    );
  });

  it('put() uploads a Buffer built from string contents with mapped headers', async () => {
    uploadData.mockResolvedValue(undefined);
    const driver = buildDriver();

    await driver.put('a.txt', 'hello', { contentType: 'text/plain' });

    expect(uploadData).toHaveBeenCalledWith(
      Buffer.from('hello'),
      expect.objectContaining({
        blobHTTPHeaders: expect.objectContaining({
          blobContentType: 'text/plain',
        }),
      }),
    );
  });

  it('put() uploads Uint8Array contents', async () => {
    uploadData.mockResolvedValue(undefined);
    const driver = buildDriver();

    await driver.put('a.txt', new Uint8Array([1, 2, 3]));

    expect(uploadData).toHaveBeenCalledWith(
      Buffer.from([1, 2, 3]),
      expect.any(Object),
    );
  });

  it('putStream() uploads a readable stream with mapped headers', async () => {
    uploadStream.mockResolvedValue(undefined);
    const driver = buildDriver();
    const stream = {} as Readable;

    await driver.putStream('a.txt', stream, {
      contentEncoding: 'gzip',
    });

    expect(uploadStream).toHaveBeenCalledWith(
      stream,
      undefined,
      undefined,
      expect.objectContaining({
        blobHTTPHeaders: expect.objectContaining({
          blobContentEncoding: 'gzip',
        }),
      }),
    );
  });

  it('copy() syncCopyFromURL from the source blob url', async () => {
    syncCopyFromURL.mockResolvedValue(undefined);
    const driver = buildDriver();

    await driver.copy('a.txt', 'b.txt');

    expect(syncCopyFromURL).toHaveBeenCalledWith(
      'https://mockaccount.blob.core.windows.net/mockcontainer/a.txt',
    );
  });

  it('move() copies then deletes the source', async () => {
    syncCopyFromURL.mockResolvedValue(undefined);
    deleteIfExists.mockResolvedValue(undefined);
    const driver = buildDriver();

    await driver.move('a.txt', 'b.txt');

    expect(syncCopyFromURL).toHaveBeenCalled();
    expect(deleteIfExists).toHaveBeenCalled();
  });

  it('delete() calls deleteIfExists', async () => {
    deleteIfExists.mockResolvedValue(undefined);
    const driver = buildDriver();

    await driver.delete('a.txt');

    expect(deleteIfExists).toHaveBeenCalled();
  });

  it('deleteAll() deletes every blob under the prefix', async () => {
    listBlobsFlat.mockReturnValue(
      buildPagedIterable([{ name: 'a/1.txt' }, { name: 'a/2.txt' }], null),
    );
    deleteIfExists.mockResolvedValue(undefined);
    const driver = buildDriver();

    await driver.deleteAll('a');

    expect(listBlobsFlat).toHaveBeenCalledWith({ prefix: 'a' });
    expect(deleteIfExists).toHaveBeenCalledTimes(2);
  });

  it('deleteAll() normalizes a bare "/" prefix to the container root', async () => {
    listBlobsFlat.mockReturnValue(buildPagedIterable([], null));
    const driver = buildDriver();

    await driver.deleteAll('/');

    expect(listBlobsFlat).toHaveBeenCalledWith({ prefix: '' });
  });

  it('listAll() non-recursive returns files and directories from one page', async () => {
    const page = buildHierarchyPage(['a/file.txt'], ['a/sub/'], 'next-token');
    listBlobsByHierarchy.mockReturnValue(buildPagedIterable([], page));
    const driver = buildDriver();

    const result = await driver.listAll('a');

    expect(listBlobsByHierarchy).toHaveBeenCalledWith('/', { prefix: 'a' });
    const objects = Array.from(result.objects);
    expect(objects).toHaveLength(2);
    expect(objects[0]).toMatchObject({ key: 'a/file.txt', isFile: true });
    expect(objects[1]).toMatchObject({ name: 'sub', isDirectory: true });
    expect(result.paginationToken).toBe('next-token');
  });

  it('listAll() recursive returns only files, no directories', async () => {
    const page = buildFlatPage(['a/file1.txt', 'a/file2.txt']);
    listBlobsFlat.mockReturnValue(buildPagedIterable([], page));
    const driver = buildDriver();

    const result = await driver.listAll('a', { recursive: true });

    expect(listBlobsFlat).toHaveBeenCalledWith({ prefix: 'a' });
    const objects = Array.from(result.objects);
    expect(objects).toHaveLength(2);
    expect(objects.every((o) => 'isFile' in o && o.isFile)).toBe(true);
    expect(result.paginationToken).toBeUndefined();
  });

  it('listAll() normalizes a bare "/" prefix', async () => {
    listBlobsByHierarchy.mockReturnValue(
      buildPagedIterable([], buildHierarchyPage([], [])),
    );
    const driver = buildDriver();

    await driver.listAll('/');

    expect(listBlobsByHierarchy).toHaveBeenCalledWith('/', { prefix: '' });
  });

  it('listAll() recursive handles an exhausted iterator (no page)', async () => {
    listBlobsFlat.mockReturnValue(buildPagedIterable([], undefined));
    const driver = buildDriver();

    const result = await driver.listAll('a', { recursive: true });

    expect(Array.from(result.objects)).toHaveLength(0);
    expect(result.paginationToken).toBeUndefined();
  });

  it('listAll() recursive handles a page whose segment omits blobItems', async () => {
    listBlobsFlat.mockReturnValue(
      buildPagedIterable([], { segment: {}, continuationToken: undefined }),
    );
    const driver = buildDriver();

    const result = await driver.listAll('a', { recursive: true });

    expect(Array.from(result.objects)).toHaveLength(0);
  });

  it('listAll() non-recursive handles an exhausted iterator (no page)', async () => {
    listBlobsByHierarchy.mockReturnValue(buildPagedIterable([], undefined));
    const driver = buildDriver();

    const result = await driver.listAll('a');

    expect(Array.from(result.objects)).toHaveLength(0);
    expect(result.paginationToken).toBeUndefined();
  });

  it('listAll() non-recursive handles a page whose segment omits blobItems/blobPrefixes', async () => {
    listBlobsByHierarchy.mockReturnValue(
      buildPagedIterable([], { segment: {}, continuationToken: undefined }),
    );
    const driver = buildDriver();

    const result = await driver.listAll('a');

    expect(Array.from(result.objects)).toHaveLength(0);
  });

  it('bucket() returns a new AzureDriver pointed at a different container', () => {
    const driver = buildDriver();
    const other = driver.bucket('other-container');

    expect(other).toBeInstanceOf(AzureDriver);
    expect((other as any).options.containerName).toBe('other-container');
  });
});
