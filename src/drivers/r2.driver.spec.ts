import { S3Driver } from './s3.driver';
import { R2Driver } from './r2.driver';
import { R2DriverOptions } from 'src/interfaces';

describe('R2Driver', () => {
  it('extends S3Driver', () => {
    const driver = new R2Driver({
      bucket: 'test-bucket',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
    } as R2DriverOptions);

    expect(driver).toBeInstanceOf(S3Driver);
  });

  it('forces visibility to private and disables ACL support', () => {
    const driver = new R2Driver({
      bucket: 'test-bucket',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
      visibility: 'public',
      supportsACL: true,
    } as unknown as R2DriverOptions);

    expect((driver as any).options.visibility).toBe('private');
    expect((driver as any).options.supportsACL).toBe(false);
  });

  it('defaults region to "auto" when not provided', () => {
    const driver = new R2Driver({
      bucket: 'test-bucket',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
    } as R2DriverOptions);

    expect((driver as any).options.region).toBe('auto');
  });

  it('honors an explicit region', () => {
    const driver = new R2Driver({
      bucket: 'test-bucket',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
      region: 'us-east-1',
    } as R2DriverOptions);

    expect((driver as any).options.region).toBe('us-east-1');
  });
});
