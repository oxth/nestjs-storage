import { Logger } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { removeStoredFiles, removeStoredFilesOnError } from './upload-cleanup';

function buildDisk(remove = vi.fn().mockResolvedValue(undefined)) {
  return { disk: { delete: remove } as any, remove };
}

describe('removeStoredFiles', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes every path', async () => {
    const { disk, remove } = buildDisk();

    await removeStoredFiles(disk, ['a.png', 'b.png']);

    expect(remove).toHaveBeenCalledWith('a.png');
    expect(remove).toHaveBeenCalledWith('b.png');
  });

  it('keeps going and logs a warning when a deletion fails', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const remove = vi
      .fn()
      .mockRejectedValueOnce(new Error('access denied'))
      .mockResolvedValueOnce(undefined);
    const { disk } = buildDisk(remove);

    await expect(
      removeStoredFiles(disk, ['a.png', 'b.png']),
    ).resolves.toBeUndefined();

    expect(remove).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"a.png"');
    expect(warn.mock.calls[0][0]).toContain('access denied');
  });
});

describe('removeStoredFilesOnError', () => {
  it('passes values through and deletes nothing when the request succeeds', async () => {
    const { disk, remove } = buildDisk();

    await expect(
      firstValueFrom(removeStoredFilesOnError(of('ok'), disk, ['a.png'])),
    ).resolves.toBe('ok');
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes the files before re-throwing the original error', async () => {
    const order: string[] = [];
    const remove = vi.fn(() => {
      order.push('deleted');
      return Promise.resolve();
    });
    const { disk } = buildDisk(remove);
    const error = new Error('handler failed');

    await expect(
      firstValueFrom(
        removeStoredFilesOnError(
          throwError(() => error),
          disk,
          ['a.png'],
        ),
      ).catch((err: unknown) => {
        order.push('rejected');
        throw err;
      }),
    ).rejects.toBe(error);
    expect(order).toEqual(['deleted', 'rejected']);
  });

  it('still re-throws the original error when a deletion fails', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { disk } = buildDisk(
      vi.fn().mockRejectedValue(new Error('access denied')),
    );
    const error = new Error('handler failed');

    await expect(
      firstValueFrom(
        removeStoredFilesOnError(
          throwError(() => error),
          disk,
          ['a.png'],
        ),
      ),
    ).rejects.toBe(error);
  });
});
