import { R2DriverOptions } from 'src/interfaces';
import { S3Driver } from 'src/drivers/s3.driver';

export class R2Driver extends S3Driver {
  constructor(options: R2DriverOptions) {
    super({
      ...options,
      region: options.region || 'auto',
      visibility: 'private',
      supportsACL: false,
    });
  }
}
