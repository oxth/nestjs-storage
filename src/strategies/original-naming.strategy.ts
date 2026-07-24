import { NamingStrategy } from 'src/interfaces/storage';

export const OriginalNamingStrategy: NamingStrategy = (
  _file,
  originalName,
): string => {
  return originalName;
};
