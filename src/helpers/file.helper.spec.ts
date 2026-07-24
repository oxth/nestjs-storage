import { generateFileName } from './file.helper';
import { NamingStrategy } from 'src/interfaces';

const buildFile = (originalname: string): Express.Multer.File =>
  ({
    buffer: Buffer.from('data'),
    originalname,
  }) as Express.Multer.File;

describe('generateFileName', () => {
  it('joins the generated name under the given storedPath', async () => {
    const strategy: NamingStrategy = vi.fn().mockReturnValue('generated.png');

    const result = await generateFileName(
      strategy,
      buildFile('photo.png'),
      'avatars',
    );

    expect(strategy).toHaveBeenCalledWith(expect.any(Buffer), 'photo.png');
    expect(result).toBe('avatars/generated.png');
  });

  it('defaults to the root path when storedPath is not provided', async () => {
    const strategy: NamingStrategy = vi.fn().mockReturnValue('generated.png');

    const result = await generateFileName(strategy, buildFile('photo.png'));

    expect(result).toBe('generated.png');
  });

  it('awaits async naming strategies', async () => {
    const strategy: NamingStrategy = vi
      .fn()
      .mockResolvedValue('async-generated.png');

    const result = await generateFileName(strategy, buildFile('photo.png'));

    expect(result).toBe('async-generated.png');
  });
});
