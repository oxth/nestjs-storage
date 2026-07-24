import { Disk } from 'flydrive';
import { SignedURLOptions } from 'flydrive/types';

export type NamingStrategy<T = Uint8Array> = (
  file: T,
  originalName: string,
) => string | Promise<string>;

export interface FakeUrlBuilder {
  generateURL?(key: string, filePath: string): Promise<string>;
  generateSignedURL?(
    key: string,
    filePath: string,
    options: SignedURLOptions,
  ): Promise<string>;
  generateSignedUploadURL?(
    key: string,
    filePath: string,
    options: SignedURLOptions,
  ): Promise<string>;
}

export interface FakesConfig {
  /** Root location on the local filesystem used to persist faked disk contents. */
  location: URL | string;
  urlBuilder?: FakeUrlBuilder;
}

/**
 * Returned by StorageService.fake(). Backed by flydrive's FSDriver so it
 * behaves like a real disk while adding test assertion helpers.
 */
export interface FakeDisk extends Disk {
  assertExists(paths: string | string[]): void;
  assertMissing(paths: string | string[]): void;
  clear(): void;
}

export interface StorageFileInterceptorOptions {
  /** Disk name to use. Defaults to the default disk. */
  disk?: string;
  /** Storage directory path. Defaults to root. */
  path?: string;
  /** Naming strategy for the uploaded file. Defaults to UuidNamingStrategy. */
  namingStrategy?: NamingStrategy;
  /** Multer fileFilter function */

  fileFilter?: (req: any, file: any, cb: any) => void;
  /** Multer limits */
  limits?: { fileSize?: number; files?: number };
}
