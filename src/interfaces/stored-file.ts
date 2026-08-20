export interface StoredFile {
  /** Disk name used for storage (options.disk, or 'default' if none specified) */
  disk: string;
  /** Path in storage (e.g. 'avatars/550e8400-e29b-41d4-a716-446655440000.jpg') */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimetype: string;
  /** Original filename from the client */
  originalname: string;
}
