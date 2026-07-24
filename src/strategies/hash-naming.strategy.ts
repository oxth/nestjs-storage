import { extname } from 'node:path';
import { createHash } from 'node:crypto';

import { NamingStrategy } from 'src/interfaces/storage';

export const HashNamingStrategy: NamingStrategy = (
  file,
  originalName,
): string => {
  const ext = extname(originalName);
  const hash = createHash('sha256').update(file).digest('hex');
  return `${hash}${ext}`;
};
