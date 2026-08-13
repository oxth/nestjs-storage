import { extname } from 'node:path';
import { v7 as uuidv7 } from 'uuid';

import { NamingStrategy } from 'src/interfaces/storage';

export const UuidNamingStrategy: NamingStrategy = (
  _file,
  originalName,
): string => {
  const ext = extname(originalName);
  return `${uuidv7()}${ext}`;
};
