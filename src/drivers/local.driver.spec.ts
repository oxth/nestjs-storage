import { createHmac } from 'node:crypto';
import type { MockInstance } from 'vitest';
import { LocalDriver } from './local.driver';

describe('LocalDriver.getUrlBuilder', () => {
  describe('generateURL', () => {
    it('builds a URL by joining the base url and the key', async () => {
      const builder = LocalDriver.getUrlBuilder('https://cdn.example.com');
      const url = await builder!.generateURL!('avatars/a.png', '/tmp/a.png');
      expect(url).toBe('https://cdn.example.com/avatars/a.png');
    });

    it('strips a leading slash from the key', async () => {
      const builder = LocalDriver.getUrlBuilder('https://cdn.example.com');
      const url = await builder!.generateURL!('/avatars/a.png', '/tmp/a.png');
      expect(url).toBe('https://cdn.example.com/avatars/a.png');
    });
  });

  describe('generateSignedURL', () => {
    let warnSpy: MockInstance;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      vi.restoreAllMocks();
    });

    it('returns an unsigned URL and warns when no signSecret is configured', async () => {
      const builder = LocalDriver.getUrlBuilder('https://cdn.example.com');
      const url = await builder!.generateSignedURL!(
        'avatars/a.png',
        '/tmp/a.png',
        {},
      );

      expect(url).toBe('https://cdn.example.com/avatars/a.png');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('returns an HMAC-signed URL when signSecret is configured', async () => {
      const nowMs = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(nowMs);

      const builder = LocalDriver.getUrlBuilder(
        'https://cdn.example.com',
        'top-secret',
      );
      const url = await builder!.generateSignedURL!(
        'avatars/a.png',
        '/tmp/a.png',
        {},
      );

      const expiresAt = Math.floor(nowMs / 1000) + 1800;
      const expectedSignature = createHmac('sha256', 'top-secret')
        .update(`/avatars/a.png:${expiresAt}`)
        .digest('hex');

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        'https://cdn.example.com/avatars/a.png',
      );
      expect(parsed.searchParams.get('expires')).toBe(String(expiresAt));
      expect(parsed.searchParams.get('signature')).toBe(expectedSignature);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('honors a custom expiresIn option', async () => {
      const nowMs = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(nowMs);

      const builder = LocalDriver.getUrlBuilder(
        'https://cdn.example.com',
        'top-secret',
      );
      const url = await builder!.generateSignedURL!(
        'avatars/a.png',
        '/tmp/a.png',
        { expiresIn: '1min' },
      );

      const expiresAt = Math.floor(nowMs / 1000) + 60;
      expect(new URL(url).searchParams.get('expires')).toBe(String(expiresAt));
    });

    it('strips a leading slash from the key before signing', async () => {
      const builder = LocalDriver.getUrlBuilder(
        'https://cdn.example.com',
        'top-secret',
      );
      const url = await builder!.generateSignedURL!(
        '/avatars/a.png',
        '/tmp/a.png',
        {},
      );

      expect(new URL(url).pathname).toBe('/avatars/a.png');
    });
  });

  it('defaults the base url to an empty string when none is provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const builder = LocalDriver.getUrlBuilder();

    expect(() =>
      builder!.generateSignedURL!('a.png', '/tmp/a.png', {}),
    ).toThrow('Invalid URL');

    warnSpy.mockRestore();
  });
});

describe('LocalDriver constructor', () => {
  it('defaults visibility to private and wires the url builder', () => {
    const builderSpy = vi.spyOn(LocalDriver, 'getUrlBuilder');

    const driver = new LocalDriver({ location: '/tmp/storage' }, 'my-secret');

    expect(builderSpy).toHaveBeenCalledWith(undefined, 'my-secret');
    expect((driver as any).options.visibility).toBe('private');
    expect((driver as any).options.location).toBe('/tmp/storage');
    expect((driver as any).options.urlBuilder).toBe(
      builderSpy.mock.results[0].value,
    );

    builderSpy.mockRestore();
  });

  it('allows overriding visibility and passes through the url option', () => {
    const builderSpy = vi.spyOn(LocalDriver, 'getUrlBuilder');

    const driver = new LocalDriver({
      location: '/tmp/storage',
      visibility: 'public',
      url: 'https://cdn.example.com',
    });

    expect(builderSpy).toHaveBeenCalledWith(
      'https://cdn.example.com',
      undefined,
    );
    expect((driver as any).options.visibility).toBe('public');

    builderSpy.mockRestore();
  });
});
