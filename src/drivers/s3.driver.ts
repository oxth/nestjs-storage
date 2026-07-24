import { S3Driver as BaseS3Driver } from 'flydrive/drivers/s3';
import { CdnOptions, S3DriverOptions } from 'src/interfaces';
import { SignedURLOptions } from 'flydrive/types';
import string from '@poppinss/string';

export class S3Driver extends BaseS3Driver {
  private readonly cdnOptions?: CdnOptions;

  constructor({ cdn, ...options }: S3DriverOptions) {
    super(options);

    this.cdnOptions = cdn;
  }

  async getCloudfrontSignedUrl(
    key: string,
    options?: SignedURLOptions,
  ): Promise<string> {
    if (this.cdnOptions?.provider !== 'cloudfront') {
      throw new Error(
        'CloudFront signed URLs are not supported. config cdn options provider = "cloudfront" to use them.',
      );
    }

    let signer: typeof import('@aws-sdk/cloudfront-signer');
    try {
      signer = await import('@aws-sdk/cloudfront-signer');
    } catch {
      throw new Error(
        '@aws-sdk/cloudfront-signer is required for CloudFront signed URLs. Install it with: npm install @aws-sdk/cloudfront-signer',
      );
    }

    const url = await this.getUrl(key);
    const expires = string.seconds.parse(options?.expiresIn || '30mins');
    const expiresAt = new Date(Date.now() + expires * 1000).toISOString();

    return signer.getSignedUrl({
      url,
      keyPairId: this.cdnOptions.signingKeyId,
      privateKey: this.cdnOptions.signingKey,
      dateLessThan: expiresAt,
    });
  }

  async getSignedUrl(key: string, options?: SignedURLOptions): Promise<string> {
    if (this.options.cdnUrl && this.cdnOptions?.provider === 'cloudfront') {
      return await this.getCloudfrontSignedUrl(key, options);
    }

    return super.getSignedUrl(key, options);
  }
}
