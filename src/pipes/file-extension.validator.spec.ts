import { FileExtensionValidator } from './file-extension.validator';

function makeFile(originalname: string): Express.Multer.File {
  return { originalname } as Express.Multer.File;
}

describe('FileExtensionValidator', () => {
  describe('isValid', () => {
    it('returns false when no file is provided', () => {
      const validator = new FileExtensionValidator({
        allowedExtensions: ['.png'],
      });

      expect(validator.isValid(undefined)).toBe(false);
    });

    it('returns true when the extension matches an allowed extension with a leading dot', () => {
      const validator = new FileExtensionValidator({
        allowedExtensions: ['.png', '.jpg'],
      });

      expect(validator.isValid(makeFile('photo.png'))).toBe(true);
    });

    it('returns true when the allowed extension is configured without a leading dot', () => {
      const validator = new FileExtensionValidator({
        allowedExtensions: ['png', 'jpg'],
      });

      expect(validator.isValid(makeFile('photo.png'))).toBe(true);
    });

    it('is case-insensitive on both the file extension and the allowed list', () => {
      const validator = new FileExtensionValidator({
        allowedExtensions: ['.PNG'],
      });

      expect(validator.isValid(makeFile('photo.PNG'))).toBe(true);
    });

    it('returns false when the extension is not in the allowed list', () => {
      const validator = new FileExtensionValidator({
        allowedExtensions: ['.png', '.jpg'],
      });

      expect(validator.isValid(makeFile('document.pdf'))).toBe(false);
    });

    it('returns false when the file has no extension', () => {
      const validator = new FileExtensionValidator({
        allowedExtensions: ['.png'],
      });

      expect(validator.isValid(makeFile('photo'))).toBe(false);
    });
  });

  describe('buildErrorMessage', () => {
    it('includes the rejected extension and the allowed list', () => {
      const validator = new FileExtensionValidator({
        allowedExtensions: ['.png', '.jpg'],
      });

      expect(validator.buildErrorMessage(makeFile('document.pdf'))).toBe(
        'File extension [.pdf] is not allowed. Allowed extensions: .png, .jpg',
      );
    });

    it('handles a missing file without throwing', () => {
      const validator = new FileExtensionValidator({
        allowedExtensions: ['.png'],
      });

      expect(
        validator.buildErrorMessage(undefined as unknown as Express.Multer.File),
      ).toBe('File extension [] is not allowed. Allowed extensions: .png');
    });
  });
});
