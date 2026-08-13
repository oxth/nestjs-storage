import { extname } from 'node:path';
import { v7 as uuidv7 } from 'uuid';

import { NamingStrategy } from 'src/interfaces/storage';

function generate(originalName: string, useUuid: boolean): string {
  const ext = extname(originalName);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const leaf = useUuid ? uuidv7() : originalName.replace(ext, '');
  return `${year}/${month}/${day}/${leaf}${ext}`;
}

export const DatePathNamingStrategy: NamingStrategy = (
  _file,
  originalName,
): string => {
  return generate(originalName, false);
};

export const DatePathUuidNamingStrategy: NamingStrategy = (
  _file,
  originalName,
): string => {
  return generate(originalName, true);
};
