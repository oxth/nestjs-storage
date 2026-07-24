export type NamingStrategy<T = Uint8Array> = (
  file: T,
  originalName: string,
) => string | Promise<string>;

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
