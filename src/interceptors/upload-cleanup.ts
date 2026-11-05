import type { Disk } from 'flydrive';
import { Logger } from '@nestjs/common';
import { catchError, from, mergeMap, Observable, throwError } from 'rxjs';

// Internal to the upload interceptors; deliberately not exported from the
// interceptors barrel.

const logger = new Logger('StorageInterceptor');

/**
 * Deletes files an interceptor already stored. Each deletion is attempted even
 * if others fail, and failures are only logged, so the caller's original error
 * is always the one that surfaces.
 */
export async function removeStoredFiles(
  disk: Disk,
  paths: string[],
): Promise<void> {
  const results = await Promise.allSettled(
    paths.map((path) => disk.delete(path)),
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      logger.warn(
        `Failed to remove uploaded file "${paths[i]}" after the request failed: ${String(result.reason)}`,
      );
    }
  });
}

/**
 * Interceptors store files before pipes (e.g. `ParseFilePipe`) and the route
 * handler run. If either of those fails, remove the stored files before
 * re-throwing, so a rejected upload doesn't stay in storage.
 */
export function removeStoredFilesOnError<T>(
  source: Observable<T>,
  disk: Disk,
  paths: string[],
): Observable<T> {
  return source.pipe(
    catchError((err: unknown) =>
      from(removeStoredFiles(disk, paths)).pipe(
        mergeMap(() => throwError(() => err)),
      ),
    ),
  );
}
