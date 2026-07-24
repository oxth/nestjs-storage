import { Abstract, ModuleMetadata, Type } from '@nestjs/common/interfaces';
import { FSDriverOptions } from 'flydrive/drivers/fs/types';
import { S3DriverOptions as BaseS3DriverOptions } from 'flydrive/drivers/s3/types';
import { GCSDriverOptions } from 'flydrive/drivers/gcs/types';
import { DriverContract, ObjectVisibility } from 'flydrive/types';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { DistributiveOmit } from 'src/interfaces/ts-helper';
import { NamingStrategy } from 'src/interfaces/storage';

export type CdnProvider = 'cloudfront' | (string & {});
export type StorageDriver = 'local' | 's3' | 'r2' | 'gcs' | (string & {});

export interface Driver {
  name: StorageDriver;
  driver: (options: unknown) => DriverContract;
}

export type CdnOptions<T extends CdnProvider = CdnProvider> =
  T extends CdnProvider
    ? {
        provider: T;
        signingKeyId: T extends 'cloudfront' ? string : never;
        signingKey: T extends 'cloudfront' ? string : never;
        [key: string]: unknown;
      }
    : never;

export type LocalDriverOptions = Omit<FSDriverOptions, 'visibility'> & {
  url?: string;
  visibility?: ObjectVisibility;
};

export type S3DriverOptions = BaseS3DriverOptions & {
  cdn: CdnOptions;
};

export type R2DriverOptions = DistributiveOmit<
  S3DriverOptions,
  'visibility' | 'supportsACL' | 'endpoint' | 'region' | 'credentials'
> & {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint: S3ClientConfig['endpoint'];
  region?: S3ClientConfig['region'];
};

export type DiskOptions<T extends StorageDriver = StorageDriver> =
  T extends StorageDriver
    ? {
        driver: T;
        namingStrategy?: NamingStrategy;
        config: T extends 'local'
          ? LocalDriverOptions
          : T extends 's3'
            ? S3DriverOptions
            : T extends 'r2'
              ? R2DriverOptions
              : T extends 'gcs'
                ? GCSDriverOptions
                : Record<string, unknown>;
      }
    : never;

export interface StorageModuleOptions<
  T extends Record<string, DiskOptions> = Record<string, DiskOptions>,
> {
  default: keyof T;
  signSecret?: string;
  disks: T;
  drivers?: Driver[];
}

type ModuleOptions = Promise<StorageModuleOptions> | StorageModuleOptions;

export interface StorageOptionsFactory {
  createStorageOptions(): ModuleOptions;
}

export interface AsyncStorageModuleOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  inject?: Array<Type<any> | string | symbol | Abstract<any> | Function>;
  useClass?: Type<StorageOptionsFactory>;
  useFactory?: (...args: any[]) => ModuleOptions;
}
