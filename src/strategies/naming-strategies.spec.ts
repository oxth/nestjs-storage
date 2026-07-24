import { createHash } from 'node:crypto';
import {
  DatePathNamingStrategy,
  DatePathUuidNamingStrategy,
} from './date-path-naming.strategy';
import { HashNamingStrategy } from './hash-naming.strategy';
import { OriginalNamingStrategy } from './original-naming.strategy';
import { UuidNamingStrategy } from './uuid-naming.strategy';

const UUID_V7_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const UUID_V7_REGEX = new RegExp(`^${UUID_V7_PATTERN}$`, 'i');

describe('UuidNamingStrategy', () => {
  it('generates a uuid with the original extension', () => {
    const name = UuidNamingStrategy(Buffer.from('data'), 'photo.png') as string;
    expect(name).toMatch(new RegExp(`^${UUID_V7_PATTERN}\\.png$`, 'i'));
  });

  it('handles files without an extension', () => {
    const name = UuidNamingStrategy(Buffer.from('data'), 'photo') as string;
    expect(name).toMatch(UUID_V7_REGEX);
  });
});

describe('OriginalNamingStrategy', () => {
  it('returns the original file name unchanged', () => {
    expect(OriginalNamingStrategy(Buffer.from('data'), 'my-file.txt')).toBe(
      'my-file.txt',
    );
  });
});

describe('HashNamingStrategy', () => {
  it('hashes the file contents with sha256 and keeps the extension', () => {
    const buffer = Buffer.from('hello world');
    const expectedHash = createHash('sha256').update(buffer).digest('hex');

    expect(HashNamingStrategy(buffer, 'file.txt')).toBe(`${expectedHash}.txt`);
  });

  it('produces different hashes for different contents', () => {
    const a = HashNamingStrategy(Buffer.from('a'), 'file.txt');
    const b = HashNamingStrategy(Buffer.from('b'), 'file.txt');
    expect(a).not.toBe(b);
  });
});

describe('DatePathNamingStrategy', () => {
  it('builds a year/month/day path using the original file name', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    expect(DatePathNamingStrategy(Buffer.from('data'), 'photo.png')).toBe(
      `${year}/${month}/${day}/photo.png`,
    );
  });

  it('handles files without an extension', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    expect(DatePathNamingStrategy(Buffer.from('data'), 'photo')).toBe(
      `${year}/${month}/${day}/photo`,
    );
  });
});

describe('DatePathUuidNamingStrategy', () => {
  it('builds a year/month/day path using a uuid leaf name', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const name = DatePathUuidNamingStrategy(
      Buffer.from('data'),
      'photo.png',
    ) as string;

    expect(name).toMatch(
      new RegExp(`^${year}/${month}/${day}/${UUID_V7_PATTERN}\\.png$`, 'i'),
    );
  });
});
