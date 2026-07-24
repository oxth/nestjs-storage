import { FSDriver } from 'flydrive/drivers/fs';
import { LocalDriverOptions } from 'src/interfaces';
import { SignedURLOptions } from 'flydrive/types';
import string from '@poppinss/string';
import { createHmac } from 'node:crypto';

export class LocalDriver extends FSDriver {
  constructor(
    { url, visibility, ...options }: LocalDriverOptions,
    signSecret?: string,
  ) {
    super({
      ...options,
      visibility: visibility ?? 'private',
      urlBuilder: LocalDriver.getUrlBuilder(url, signSecret),
    });
  }

  static getUrlBuilder(
    url?: string,
    signSecret?: string,
  ): LocalDriverOptions['urlBuilder'] {
    const baseUrl = url ?? '';

    return {
      generateURL: (key: string, _filePath: string): Promise<string> => {
        const normalizedPath = key.startsWith('/') ? key.slice(1) : key;

        return Promise.resolve(
          new URL(`${baseUrl}/${normalizedPath}`).toString(),
        );
      },
      generateSignedURL: (
        key: string,
        _filePath: string,
        options: SignedURLOptions,
      ): Promise<string> => {
        const normalizedPath = key.startsWith('/') ? key.slice(1) : key;
        const fullUrl = new URL(`${baseUrl}/${normalizedPath}`);

        if (!signSecret) {
          console.warn(
            'LocalDisk.temporaryUrl: set DiskConfig.signSecret to enable HMAC-signed URLs. Returning an unsigned URL.',
          );
          return Promise.resolve(fullUrl.toString());
        }

        const expires = string.seconds.parse(options?.expiresIn || '30mins');
        const expiresAt = Math.floor(Date.now() / 1000) + expires;

        const payload = `${fullUrl.pathname}:${expiresAt}`;
        const signature = createHmac('sha256', signSecret)
          .update(payload)
          .digest('hex');

        fullUrl.search = `expires=${expiresAt}&signature=${signature}`;
        return Promise.resolve(fullUrl.toString());
      },
    };
  }
}
