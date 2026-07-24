import { mkdtempSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { StorageService } from './storage.service';
import { StorageModuleOptions } from 'src/interfaces';
import { UuidNamingStrategy } from 'src/strategies';

function mkTmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('StorageService (local disk, real filesystem)', () => {
  let localDir: string;
  let service: StorageService;

  beforeEach(() => {
    localDir = mkTmp('nestjs-storage-local-');
    const options: StorageModuleOptions = {
      default: 'local',
      disks: {
        local: {
          driver: 'local',
          config: {
            location: localDir,
            url: 'https://cdn.test',
            visibility: 'public',
          },
        },
      },
    };
    service = new StorageService(options);
  });

  afterEach(() => {
    rmSync(localDir, { recursive: true, force: true });
  });

  it('getDefaultDisk returns the configured default disk name', () => {
    expect(service.getDefaultDisk()).toBe('local');
  });

  it('getSignSecret returns undefined when not configured', () => {
    expect(service.getSignSecret()).toBeUndefined();
  });

  it('getNamingStrategy defaults to UuidNamingStrategy', () => {
    expect(service.getNamingStrategy()).toBe(UuidNamingStrategy);
    expect(service.getNamingStrategy('local')).toBe(UuidNamingStrategy);
  });

  it('getNamingStrategy returns the disk-configured strategy when set', () => {
    const customStrategy = () => 'custom';
    const options: StorageModuleOptions = {
      default: 'local',
      disks: {
        local: {
          driver: 'local',
          config: { location: localDir },
          namingStrategy: customStrategy,
        },
      },
    };
    const customService = new StorageService(options);
    expect(customService.getNamingStrategy()).toBe(customStrategy);
  });

  it('disk() returns a usable Disk for the default and named disk', () => {
    expect(service.disk()).toBeDefined();
    expect(service.disk('local')).toBeDefined();
  });

  it('file() and fromSnapshot() build DriveFile pointers', async () => {
    await service.put('a.txt', 'hello');
    const file = service.file('a.txt');
    expect(file.key).toBe('a.txt');

    const snapshot = await file.toSnapshot();
    const fromSnapshot = service.fromSnapshot(snapshot);
    expect(fromSnapshot.key).toBe('a.txt');
  });

  it('put/get/exists/getBytes/getArrayBuffer/getMetaData/getStream round-trip', async () => {
    await service.put('a.txt', 'hello world');

    expect(await service.exists('a.txt')).toBe(true);
    expect(await service.get('a.txt')).toBe('hello world');
    expect(Buffer.from(await service.getBytes('a.txt')).toString()).toBe(
      'hello world',
    );
    expect(Buffer.from(await service.getArrayBuffer('a.txt')).toString()).toBe(
      'hello world',
    );

    const meta = await service.getMetaData('a.txt');
    expect(meta.contentLength).toBe('hello world'.length);

    const stream = await service.getStream('a.txt');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('hello world');
  });

  it('getVisibility/setVisibility resolve using the configured visibility', async () => {
    await service.put('a.txt', 'hello');
    expect(await service.getVisibility('a.txt')).toBe('public');
    await expect(
      service.setVisibility('a.txt', 'private'),
    ).resolves.toBeUndefined();
  });

  it('getUrl builds a public URL from the configured base url', async () => {
    await service.put('a.txt', 'hello');
    expect(await service.getUrl('a.txt')).toBe('https://cdn.test/a.txt');
  });

  it('getSignedUrl warns and returns an unsigned url without a signSecret', async () => {
    await service.put('a.txt', 'hello');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await service.getSignedUrl('a.txt')).toBe('https://cdn.test/a.txt');
    warnSpy.mockRestore();
  });

  it('getSignedUrl returns a signed url when a signSecret is configured', async () => {
    const signedOptions: StorageModuleOptions = {
      default: 'local',
      signSecret: 'top-secret',
      disks: {
        local: {
          driver: 'local',
          config: { location: localDir, url: 'https://cdn.test' },
        },
      },
    };
    const signedService = new StorageService(signedOptions);
    await signedService.put('a.txt', 'hello');

    const url = await signedService.getSignedUrl('a.txt');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('signature')).toBeTruthy();
    expect(parsed.searchParams.get('expires')).toBeTruthy();
  });

  it('getSignedUploadUrl rejects because the local driver does not support it', async () => {
    await service.put('a.txt', 'hello');
    await expect(service.getSignedUploadUrl('a.txt')).rejects.toThrow();
  });

  it('copy/copyFromFs/move/moveFromFs/delete/deleteAll/listAll work end-to-end', async () => {
    await service.put('a.txt', 'hello');

    await service.copy('a.txt', 'b.txt');
    expect(await service.exists('b.txt')).toBe(true);

    const externalDir = mkTmp('nestjs-storage-external-');
    const externalFile = join(externalDir, 'external.txt');
    writeFileSync(externalFile, 'from fs');
    await service.copyFromFs(externalFile, 'c.txt');
    expect(await service.get('c.txt')).toBe('from fs');
    expect(existsSync(externalFile)).toBe(true);

    await service.move('b.txt', 'd.txt');
    expect(await service.exists('b.txt')).toBe(false);
    expect(await service.exists('d.txt')).toBe(true);

    const externalFile2 = join(externalDir, 'external2.txt');
    writeFileSync(externalFile2, 'from fs 2');
    await service.moveFromFs(externalFile2, 'e.txt');
    expect(await service.get('e.txt')).toBe('from fs 2');
    expect(existsSync(externalFile2)).toBe(false);

    const putStreamKey = 'streamed.txt';
    const { Readable } = await import('node:stream');
    await service.putStream(putStreamKey, Readable.from(['streamed data']));
    expect(await service.get(putStreamKey)).toBe('streamed data');

    const { objects } = await service.listAll();
    const names = Array.from(objects).map((entry) => entry.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'a.txt',
        'c.txt',
        'd.txt',
        'e.txt',
        putStreamKey,
      ]),
    );

    await service.delete('d.txt');
    expect(await service.exists('d.txt')).toBe(false);

    await service.deleteAll();
    expect(await service.exists('a.txt')).toBe(false);

    rmSync(externalDir, { recursive: true, force: true });
  });
});

describe('StorageService custom drivers option', () => {
  it('registers a custom driver and uses it for a configured disk', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const memoryDriverFactory = vi.fn().mockReturnValue({ put });

    const options: StorageModuleOptions = {
      default: 'memory',
      disks: {
        memory: { driver: 'memory', config: {} },
      },
      drivers: [{ name: 'memory', driver: memoryDriverFactory }],
    };
    const service = new StorageService(options);

    await service.put('a.txt', 'hi');

    expect(memoryDriverFactory).toHaveBeenCalledWith({});
    expect(put).toHaveBeenCalledWith('a.txt', 'hi', undefined);
  });

  it('allows overriding a built-in driver name', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const overrideFactory = vi.fn().mockReturnValue({ put });

    const options: StorageModuleOptions = {
      default: 'local',
      disks: {
        local: { driver: 'local', config: {} },
      },
      drivers: [{ name: 'local', driver: overrideFactory }],
    };
    const service = new StorageService(options);

    await service.put('a.txt', 'hi');

    expect(overrideFactory).toHaveBeenCalledWith({});
    expect(put).toHaveBeenCalled();
  });
});

describe('StorageService remote driver wiring (construction only)', () => {
  it('constructs an s3 disk without making network calls', () => {
    const options: StorageModuleOptions = {
      default: 's3',
      disks: {
        s3: {
          driver: 's3',
          config: {
            bucket: 'test-bucket',
            visibility: 'public',
            region: 'us-east-1',
            credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
            cdn: undefined,
          },
        },
      },
    };
    const service = new StorageService(options);
    expect(() => service.disk('s3')).not.toThrow();
  });

  it('constructs an r2 disk without making network calls', () => {
    const options: StorageModuleOptions = {
      default: 'r2',
      disks: {
        r2: {
          driver: 'r2',
          config: {
            bucket: 'test-bucket',
            endpoint: 'https://account-id.r2.cloudflarestorage.com',
            credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
          },
        },
      },
    };
    const service = new StorageService(options);
    expect(() => service.disk('r2')).not.toThrow();
  });

  it('constructs a gcs disk without making network calls', () => {
    const options: StorageModuleOptions = {
      default: 'gcs',
      disks: {
        gcs: {
          driver: 'gcs',
          config: { bucket: 'test-bucket' },
        },
      },
    };
    const service = new StorageService(options);
    expect(() => service.disk('gcs')).not.toThrow();
  });
});

describe('StorageService fake()/restore()', () => {
  let localDir: string;

  beforeEach(() => {
    localDir = mkTmp('nestjs-storage-real-');
  });

  afterEach(() => {
    rmSync(localDir, { recursive: true, force: true });
  });

  it('uses a default temp-dir fakes location when none is configured', async () => {
    const options: StorageModuleOptions = {
      default: 'local',
      disks: {
        local: { driver: 'local', config: { location: localDir } },
      },
    };
    const service = new StorageService(options);

    const fake = service.fake('local');
    await fake.put('a.txt', 'faked contents');

    fake.assertExists('a.txt');
    expect(existsSync(join(localDir, 'a.txt'))).toBe(false);

    // disk()-based access is transparently redirected to the fake disk
    expect(await service.get('a.txt')).toBe('faked contents');

    service.restore('local');
    fake.assertMissing('a.txt');
    expect(await service.exists('a.txt')).toBe(false);
  });

  it('uses a custom fakes location when configured', async () => {
    const fakesDir = mkTmp('nestjs-storage-fakes-');
    const options: StorageModuleOptions = {
      default: 'local',
      disks: {
        local: { driver: 'local', config: { location: localDir } },
      },
      fakes: { location: fakesDir },
    };
    const service = new StorageService(options);

    const fake = service.fake('local');
    await fake.put('a.txt', 'faked contents');

    expect(existsSync(join(fakesDir, 'local', 'a.txt'))).toBe(true);

    service.restore('local');
    rmSync(fakesDir, { recursive: true, force: true });
  });
});
