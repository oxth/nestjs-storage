import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_MODULE_OPTIONS } from './constants';
import type {
  FakeDisk,
  FakesConfig,
  LocalDriverOptions,
  NamingStrategy,
  R2DriverOptions,
  S3DriverOptions,
  StorageModuleOptions,
} from 'src/interfaces';
import { GCSDriver } from 'flydrive/drivers/gcs';
import {
  DriverContract,
  FileSnapshot,
  ObjectMetaData,
  ObjectVisibility,
  SignedURLOptions,
  WriteOptions,
} from 'flydrive/types';
import { GCSDriverOptions } from 'flydrive/drivers/gcs/types';
import { Disk, DriveDirectory, DriveFile, DriveManager } from 'flydrive';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Driver } from 'src/drivers/s3.driver';
import { LocalDriver } from 'src/drivers/local.driver';
import { R2Driver } from 'src/drivers/r2.driver';
import { UuidNamingStrategy } from 'src/strategies';

@Injectable()
export class StorageService {
  private readonly driveManager: DriveManager<
    Record<string, () => DriverContract>
  >;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS)
    private readonly options: StorageModuleOptions,
  ) {
    this.driveManager = this.createDrivers(options);
  }

  private getAvailableDrivers(): Record<
    string,
    (options: unknown) => DriverContract
  > {
    const defaultDrivers = {
      local: (options: LocalDriverOptions) =>
        new LocalDriver(options, this.options.signSecret),
      s3: (options: S3DriverOptions) => new S3Driver(options),
      r2: (options: R2DriverOptions) => new R2Driver(options),
      gcs: (options: GCSDriverOptions) => new GCSDriver(options),
    };
    return (this.options.drivers || []).reduce((acc, cur) => {
      acc[cur.name] = cur.driver;
      return acc;
    }, defaultDrivers);
  }

  private createDrivers(options: StorageModuleOptions) {
    const availableDrivers = this.getAvailableDrivers();
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
