import path from 'node:path';
import { NamingStrategy } from 'src/interfaces';

export async function generateFileName(
  strategy: NamingStrategy,
  file: Express.Multer.File,
  storedPath?: string,
): Promise<string> {
  const filename = await strategy(file.buffer, file.originalname);
  return path.join(storedPath ?? '', filename);
}
