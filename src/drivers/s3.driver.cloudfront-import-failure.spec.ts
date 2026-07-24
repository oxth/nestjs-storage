import { S3Driver } from './s3.driver';

vi.mock('@aws-sdk/cloudfront-signer', () => {
  throw new Error('Cannot find module "@aws-sdk/cloudfront-signer"');
});

describe('S3Driver.getCloudfrontSignedUrl (import failure)', () => {
  it('throws a helpful error when @aws-sdk/cloudfront-signer cannot be imported', async () => {
    const driver = new S3Driver({
      bucket: 'test-bucket',
      visibility: 'public',
      region: 'us-east-1',
      credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
      cdnUrl: 'https://cdn.example.com',
      cdn: {
        provider: 'cloudfront',
        signingKeyId: 'key-id',
        signingKey: 'private-key',
      },
    });

    await expect(driver.getCloudfrontSignedUrl('a.png')).rejects.toThrow(
      '@aws-sdk/cloudfront-signer is required for CloudFront signed URLs. Install it with: npm install @aws-sdk/cloudfront-signer',
    );
  });
});
