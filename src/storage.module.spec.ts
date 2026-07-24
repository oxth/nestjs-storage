import { Test } from '@nestjs/testing';
import { Global, Injectable, Module } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageModule } from './storage.module';
import { StorageService } from './storage.service';
import { STORAGE_MODULE_OPTIONS } from './constants';
import { StorageModuleOptions, StorageOptionsFactory } from 'src/interfaces';

function buildOptions(location: string): StorageModuleOptions {
  return {
    default: 'local',
    disks: {
      local: { driver: 'local', config: { location } },
    },
  };
}

describe('StorageModule.forRoot', () => {
  let localDir: string;

  beforeEach(() => {
    localDir = mkdtempSync(join(tmpdir(), 'nestjs-storage-module-'));
  });

  afterEach(() => {
    rmSync(localDir, { recursive: true, force: true });
  });

  it('returns a dynamic module with the options provider and a StorageService factory', () => {
    const options = buildOptions(localDir);
    const dynamicModule = StorageModule.forRoot(options);

    expect(dynamicModule.module).toBe(StorageModule);
    expect(dynamicModule.exports).toEqual([StorageService]);
    expect(dynamicModule.providers).toEqual([
      { provide: STORAGE_MODULE_OPTIONS, useValue: options },
      {
        provide: StorageService,
        useFactory: expect.any(Function),
        inject: [STORAGE_MODULE_OPTIONS],
      },
    ]);
  });

  it('wires STORAGE_MODULE_OPTIONS and StorageService through real Nest DI', async () => {
    const options = buildOptions(localDir);
    const moduleRef = await Test.createTestingModule({
      imports: [StorageModule.forRoot(options)],
    }).compile();

    expect(moduleRef.get(STORAGE_MODULE_OPTIONS)).toBe(options);
    expect(moduleRef.get(StorageService)).toBeInstanceOf(StorageService);
    expect(moduleRef.get(StorageService).getDefaultDisk()).toBe('local');

    await moduleRef.close();
  });
});

describe('StorageModule.forRootAsync', () => {
  let localDir: string;

  beforeEach(() => {
    localDir = mkdtempSync(join(tmpdir(), 'nestjs-storage-module-async-'));
  });

  afterEach(() => {
    rmSync(localDir, { recursive: true, force: true });
  });

  it('resolves options via useFactory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        StorageModule.forRootAsync({
          useFactory: () => buildOptions(localDir),
        }),
      ],
    }).compile();

    const service = moduleRef.get(StorageService);
    expect(service.getDefaultDisk()).toBe('local');

    await moduleRef.close();
  });

  it('resolves options via useFactory with injected dependencies', async () => {
    const CONFIG_TOKEN = 'CONFIG_TOKEN';

    @Global()
    @Module({
      providers: [{ provide: CONFIG_TOKEN, useValue: localDir }],
      exports: [CONFIG_TOKEN],
    })
    class ConfigModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        StorageModule.forRootAsync({
          imports: [ConfigModule],
          inject: [CONFIG_TOKEN],
          useFactory: (location: string) => buildOptions(location),
        }),
      ],
    }).compile();

    const service = moduleRef.get(StorageService);
    expect(service.getDefaultDisk()).toBe('local');

    await moduleRef.close();
  });

  it('resolves options via useClass', async () => {
    @Injectable()
    class TestOptionsFactory implements StorageOptionsFactory {
      createStorageOptions(): StorageModuleOptions {
        return buildOptions(localDir);
      }
    }

    const moduleRef = await Test.createTestingModule({
      imports: [StorageModule.forRootAsync({ useClass: TestOptionsFactory })],
    }).compile();

    const service = moduleRef.get(StorageService);
    expect(service.getDefaultDisk()).toBe('local');

    await moduleRef.close();
  });
});
