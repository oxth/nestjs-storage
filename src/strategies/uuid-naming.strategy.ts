import { extname } from 'node:path';
import { randomUUIDv7 } from 'node:crypto';

import { NamingStrategy } from 'src/interfaces/storage';

export const UuidNamingStrategy: NamingStrategy = (
  _file,
  originalName,
): string => {
  const ext = extname(originalName);
  return `${randomUUIDv7()}${ext}`;
};
