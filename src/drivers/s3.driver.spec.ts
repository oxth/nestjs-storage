import { S3Driver as BaseS3Driver } from 'flydrive/drivers/s3';
import { S3Driver } from './s3.driver';
import { S3DriverOptions } from 'src/interfaces';

vi.mock('@aws-sdk/cloudfront-signer', () => ({
  getSignedUrl: vi.fn(),
}));

function buildDriver(overrides: Partial<S3DriverOptions> = {}): S3Driver {
  return new S3Driver({
    bucket: 'test-bucket',
    visibility: 'public',
    region: 'us-east-1',
    credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
    ...overrides,
  } as S3DriverOptions);
}

describe('S3Driver', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSignedUrl', () => {
    it('delegates to the base driver when no cdn is configured', async () => {
      const driver = buildDriver();
      const superSpy = vi
        .spyOn(BaseS3Driver.prototype, 'getSignedUrl')
        .mockResolvedValue('https://s3.example/signed');

      const url = await driver.getSignedUrl('a.png');

      expect(superSpy).toHaveBeenCalledWith('a.png', undefined);
      expect(url).toBe('https://s3.example/signed');
    });

    it('delegates to the base driver when cdn provider is not cloudfront', async () => {
      const driver = buildDriver({
        cdnUrl: 'https://cdn.example.com',
        cdn: { provider: 's3' } as any,
      });
      const superSpy = vi
        .spyOn(BaseS3Driver.prototype, 'getSignedUrl')
        .mockResolvedValue('https://s3.example/signed');

      const url = await driver.getSignedUrl('a.png');

      expect(superSpy).toHaveBeenCalled();
      expect(url).toBe('https://s3.example/signed');
    });

    it('delegates to the base driver when cdnUrl is not configured, even with cloudfront provider', async () => {
      const driver = buildDriver({
        cdn: { provider: 'cloudfront' } as any,
      });
      const superSpy = vi
        .spyOn(BaseS3Driver.prototype, 'getSignedUrl')
        .mockResolvedValue('https://s3.example/signed');

      const url = await driver.getSignedUrl('a.png');

      expect(superSpy).toHaveBeenCalled();
      expect(url).toBe('https://s3.example/signed');
    });

    it('delegates to getCloudfrontSignedUrl when cdnUrl and cloudfront provider are configured', async () => {
      const driver = buildDriver({
        cdnUrl: 'https://cdn.example.com',
        cdn: {
          provider: 'cloudfront',
          signingKeyId: 'key-id',
          signingKey: 'private-key',
        } as any,
      });
      const cfSpy = vi
        .spyOn(driver, 'getCloudfrontSignedUrl')
        .mockResolvedValue('https://cdn.example.com/signed');

      const url = await driver.getSignedUrl('a.png', { expiresIn: '5mins' });

      expect(cfSpy).toHaveBeenCalledWith('a.png', { expiresIn: '5mins' });
      expect(url).toBe('https://cdn.example.com/signed');
    });
  });

  describe('getCloudfrontSignedUrl', () => {
    it('throws when the cdn provider is not cloudfront', async () => {
      const driver = buildDriver({ cdn: { provider: 's3' } as any });

      await expect(driver.getCloudfrontSignedUrl('a.png')).rejects.toThrow(
        'CloudFront signed URLs are not supported',
      );
    });

    it('throws when no cdn is configured at all', async () => {
      const driver = buildDriver();

      await expect(driver.getCloudfrontSignedUrl('a.png')).rejects.toThrow(
        'CloudFront signed URLs are not supported',
      );
    });

    it('signs a cloudfront URL using the configured signing key', async () => {
      const driver = buildDriver({
        cdnUrl: 'https://cdn.example.com',
        cdn: {
          provider: 'cloudfront',
          signingKeyId: 'key-id',
          signingKey: 'private-key',
        } as any,
      });

      vi.spyOn(driver, 'getUrl').mockResolvedValue(
        'https://cdn.example.com/a.png',
      );

      const cfModule = await import('@aws-sdk/cloudfront-signer');
      const signSpy = vi
        .mocked(cfModule.getSignedUrl)
        .mockReturnValue('https://cdn.example.com/a.png?signed=1');

      const url = await driver.getCloudfrontSignedUrl('a.png', {
        expiresIn: '10mins',
      });

      expect(url).toBe('https://cdn.example.com/a.png?signed=1');
      expect(signSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://cdn.example.com/a.png',
          keyPairId: 'key-id',
          privateKey: 'private-key',
        }),
      );
    });

    it('defaults the expiry to 30mins when no options are given', async () => {
      const driver = buildDriver({
        cdnUrl: 'https://cdn.example.com',
        cdn: {
          provider: 'cloudfront',
          signingKeyId: 'key-id',
          signingKey: 'private-key',
        } as any,
      });

      vi.spyOn(driver, 'getUrl').mockResolvedValue(
        'https://cdn.example.com/a.png',
      );

      const cfModule = await import('@aws-sdk/cloudfront-signer');
      vi.mocked(cfModule.getSignedUrl).mockReturnValue(
        'https://cdn.example.com/a.png?signed=1',
      );

      const url = await driver.getCloudfrontSignedUrl('a.png');

      expect(url).toBe('https://cdn.example.com/a.png?signed=1');
    });
  });
});
