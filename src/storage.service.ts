import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_MODULE_OPTIONS } from './constants';
import type {
  AzureDriverOptions,
  FakeDisk,
  FakesConfig,
  LocalDriverOptions,
  NamingStrategy,
  R2DriverOptions,
  S3DriverOptions,
  StorageModuleOptions,
} from 'src/interfaces';
import { GCSDriverOptions } from 'flydrive/drivers/gcs/types';
import {
  DriverContract,
  FileSnapshot,
  ObjectMetaData,
  ObjectVisibility,
  SignedURLOptions,
  WriteOptions,
} from 'flydrive/types';
import { Disk, DriveDirectory, DriveFile, DriveManager } from 'flydrive';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDriver } from 'src/drivers/local.driver';
import { UuidNamingStrategy } from 'src/strategies';

/**
 * @oxth/nestjs-storage bundles into a single entry point, so a plain
 * top-level `import` of the s3/r2/gcs/azure driver modules would pull in
 * @aws-sdk/client-s3, @google-cloud/storage, and @azure/storage-blob for
 * every consumer, even ones that only use the local disk. Resolving them
 * here, lazily, and only for driver names actually present in `disks`,
 * keeps those SDKs truly optional. StorageModule awaits `init()` before
 * handing out the instance, so this only runs once, before any disk is used.
 */
@Injectable()
export class StorageService {
  private driveManager!: DriveManager<Record<string, () => DriverContract>>;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS)
    private readonly options: StorageModuleOptions,
  ) {}

  /**
   * Resolves the driver(s) this instance needs and builds the underlying
   * DriveManager. Called by StorageModule before the service is handed out;
   * if you construct StorageService manually (e.g. in a test), call this
   * yourself first.
   */
  async init(): Promise<void> {
    this.driveManager = await this.createDrivers(this.options);
  }

  private async getAvailableDrivers(
    usedDrivers: ReadonlySet<string>,
  ): Promise<Record<string, (options: unknown) => DriverContract>> {
    const defaultDrivers: Record<string, (options: unknown) => DriverContract> =
      {
        local: ((options: LocalDriverOptions) =>
          new LocalDriver(options, this.options.signSecret)) as (
          options: unknown,
        ) => DriverContract,
      };

    if (usedDrivers.has('s3')) {
      const { S3Driver } = await import('./drivers/s3.driver.js');
      defaultDrivers.s3 = ((options: S3DriverOptions) =>
        new S3Driver(options)) as (options: unknown) => DriverContract;
    }

    if (usedDrivers.has('r2')) {
      const { R2Driver } = await import('./drivers/r2.driver.js');
      defaultDrivers.r2 = ((options: R2DriverOptions) =>
        new R2Driver(options)) as (options: unknown) => DriverContract;
    }

    if (usedDrivers.has('gcs')) {
      const { GCSDriver } = await import('flydrive/drivers/gcs');
      defaultDrivers.gcs = ((options: GCSDriverOptions) =>
        new GCSDriver(options)) as (options: unknown) => DriverContract;
    }

    if (usedDrivers.has('azure')) {
      const { AzureDriver } = await import('./drivers/azure.driver.js');
      defaultDrivers.azure = ((options: AzureDriverOptions) =>
        new AzureDriver(options)) as (options: unknown) => DriverContract;
    }

    return (this.options.drivers || []).reduce((acc, cur) => {
      acc[cur.name] = cur.driver;
      return acc;
    }, defaultDrivers);
  }

  private async createDrivers(options: StorageModuleOptions) {
    const usedDrivers = new Set(
      Object.values(options.disks).map((disk) => disk.driver),
    );
    const availableDrivers = await this.getAvailableDrivers(usedDrivers);
    const services: Record<string, () => DriverContract> = Object.entries(
      options.disks,
    ).reduce((acc, [name, { driver, config }]) => {
      acc[name] = () => availableDrivers[driver](config);
      return acc;
    }, {});

    return new DriveManager({
      default: options.default,
      services,
      fakes: options.fakes ?? this.getDefaultFakesConfig(),
    });
  }

  private getDefaultFakesConfig(): FakesConfig {
    return { location: join(tmpdir(), 'oxth-nestjs-storage-fakes') };
  }

  disk(name?: string): Disk {
    return this.driveManager.use(name);
  }

  /**
   * Swap the given disk for an in-memory-friendly fs-backed fake, useful
   * in tests. Use `restore` to bring back the real disk.
   */
  fake(name?: string): FakeDisk {
    return this.driveManager.fake(name);
  }

  restore(name?: string): void {
    this.driveManager.restore(name);
  }

  getDefaultDisk(): string {
    return this.options.default;
  }

  getNamingStrategy(diskName?: string): NamingStrategy {
    return (
      this.options.disks[diskName ?? this.getDefaultDisk()].namingStrategy ??
      UuidNamingStrategy
    );
  }

  getSignSecret(): string | undefined {
    return this.options.signSecret;
  }

  file(key: string): DriveFile {
    return this.disk().file(key);
  }

  fromSnapshot(snapshot: FileSnapshot): DriveFile {
    return this.disk().fromSnapshot(snapshot);
  }

  exists(key: string): Promise<boolean> {
    return this.disk().exists(key);
  }

  get(key: string): Promise<string> {
    return this.disk().get(key);
  }

  getStream(key: string): Promise<Readable> {
    return this.disk().getStream(key);
  }

  getBytes(key: string): Promise<Uint8Array> {
    return this.disk().getBytes(key);
  }

  /**
   * @deprecated
   * @see {@link StorageService.getBytes}
   */
  getArrayBuffer(key: string): Promise<Uint8Array> {
    return this.disk().getArrayBuffer(key);
  }

  getMetaData(key: string): Promise<ObjectMetaData> {
    return this.disk().getMetaData(key);
  }

  getVisibility(key: string): Promise<ObjectVisibility> {
    return this.disk().getVisibility(key);
  }

  getUrl(key: string): Promise<string> {
    return this.disk().getUrl(key);
  }

  getSignedUrl(key: string, options?: SignedURLOptions): Promise<string> {
    return this.disk().getSignedUrl(key, options);
  }

  getSignedUploadUrl(key: string, options?: SignedURLOptions): Promise<string> {
    return this.disk().getSignedUploadUrl(key, options);
  }

  setVisibility(key: string, visibility: ObjectVisibility): Promise<void> {
    return this.disk().setVisibility(key, visibility);
  }

  put(
    key: string,
    contents: string | Uint8Array,
    options?: WriteOptions,
  ): Promise<void> {
    return this.disk().put(key, contents, options);
  }

  putStream(key: string, contents: Readable, options?: WriteOptions) {
    return this.disk().putStream(key, contents, options);
  }

  copy(
    source: string,
    destination: string,
    options?: WriteOptions,
  ): Promise<void> {
    return this.disk().copy(source, destination, options);
  }

  copyFromFs(
    source: string | URL,
    destination: string,
    options?: WriteOptions,
  ) {
    return this.disk().copyFromFs(source, destination, options);
  }

  move(
    source: string,
    destination: string,
    options?: WriteOptions,
  ): Promise<void> {
    return this.disk().move(source, destination, options);
  }

  moveFromFs(
    source: string | URL,
    destination: string,
    options?: WriteOptions,
  ) {
    return this.disk().moveFromFs(source, destination, options);
  }

  delete(key: string): Promise<void> {
    return this.disk().delete(key);
  }

  deleteAll(prefix?: string): Promise<void> {
    return this.disk().deleteAll(prefix);
  }

  listAll(
    prefix?: string,
    options?: {
      recursive?: boolean;
      paginationToken?: string;
    },
  ): Promise<{
    paginationToken?: string;
    objects: Iterable<DriveFile | DriveDirectory>;
  }> {
    return this.disk().listAll(prefix, options);
  }
}
