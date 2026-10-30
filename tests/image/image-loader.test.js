import { describe, expect, it, vi } from 'vitest';
import { loadImage } from '../../src/image/image-loader.js';

const makeFile = (name, type) => new File(['x'], name, { type });

describe('loadImage', () => {
  it('SupportedFile_RetainsFileAndFullResolutionBitmap', async () => {
    // Arrange
    const file = makeFile('photo.png', 'image/png');
    const bitmap = { width: 6000, height: 4000 };
    const createImageBitmap = vi.fn().mockResolvedValue(bitmap);

    // Act
    const image = await loadImage(file, { createImageBitmap });

    // Assert
    expect(image.file).toBe(file);
    expect(image.bitmap).toBe(bitmap);
    expect(image.width).toBe(6000);
    expect(image.height).toBe(4000);
    expect(createImageBitmap).toHaveBeenCalledWith(file);
  });

  it('SupportedFile_ReturnsFrozenResult', async () => {
    // Arrange
    const createImageBitmap = vi
      .fn()
      .mockResolvedValue({ width: 1, height: 1 });

    // Act
    const image = await loadImage(makeFile('a.gif', 'image/gif'), {
      createImageBitmap,
    });

    // Assert
    expect(Object.isFrozen(image)).toBe(true);
  });

  it.each([
    ['photo.png', 'image/png', 'photo', 'png'],
    ['holiday.jpg', 'image/jpeg', 'holiday', 'jpg'],
    ['holiday.jpeg', 'image/jpeg', 'holiday', 'jpeg'],
    ['anim.gif', 'image/gif', 'anim', 'gif'],
    ['my.vacation.PNG', 'image/png', 'my.vacation', 'png'],
  ])(
    'FileName_%s_ParsesNameAndExtension',
    async (fileName, type, name, extension) => {
      // Arrange
      const createImageBitmap = vi
        .fn()
        .mockResolvedValue({ width: 1, height: 1 });

      // Act
      const image = await loadImage(makeFile(fileName, type), {
        createImageBitmap,
      });

      // Assert
      expect(image.name).toBe(name);
      expect(image.extension).toBe(extension);
    },
  );

  it.each([
    ['photo.png', '', 'png'],
    ['photo.JPG', 'application/octet-stream', 'jpg'],
    ['anim.gif', '', 'gif'],
  ])(
    'SupportedExtensionWithMissingMimeType_%s_DecodesFile',
    async (fileName, type, extension) => {
      // Arrange
      const createImageBitmap = vi
        .fn()
        .mockResolvedValue({ width: 1, height: 1 });

      // Act
      const image = await loadImage(makeFile(fileName, type), {
        createImageBitmap,
      });

      // Assert
      expect(image.extension).toBe(extension);
      expect(createImageBitmap).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ['photo.jfif', 'image/jpeg', 'photo', 'jpg'],
    ['scan.pjpeg', 'image/jpeg', 'scan', 'jpg'],
    ['image', 'image/png', 'image', 'png'],
    ['drawing.dat', 'image/png', 'drawing', 'png'],
    ['anim.GIFV', 'image/gif', 'anim', 'gif'],
  ])(
    'UnsupportedExtensionWithSupportedMimeType_%s_%s_UsesMimeTypeExtension',
    async (fileName, type, name, extension) => {
      // Arrange
      const createImageBitmap = vi
        .fn()
        .mockResolvedValue({ width: 1, height: 1 });

      // Act
      const image = await loadImage(makeFile(fileName, type), {
        createImageBitmap,
      });

      // Assert
      expect(image.name).toBe(name);
      expect(image.extension).toBe(extension);
    },
  );

  it('SupportedExtensionWithDifferentMimeType_KeepsFileExtension', async () => {
    // Arrange
    const createImageBitmap = vi
      .fn()
      .mockResolvedValue({ width: 1, height: 1 });

    // Act
    const image = await loadImage(makeFile('photo.jpeg', 'image/png'), {
      createImageBitmap,
    });

    // Assert
    expect(image.extension).toBe('jpeg');
  });

  it.each([
    ['file.bin', 'image/webp'],
    ['pic.svg', 'image/svg+xml'],
    ['doc.pdf', 'application/pdf'],
    ['file.bin', ''],
    ['noextension', ''],
    ['pic.webp', 'application/octet-stream'],
  ])('UnsupportedFile_%s_%s_RejectsWithoutDecoding', async (fileName, type) => {
    // Arrange
    const createImageBitmap = vi.fn();

    // Act / Assert
    await expect(
      loadImage(makeFile(fileName, type), { createImageBitmap }),
    ).rejects.toThrow(TypeError);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('DecodeFails_RejectsWithCauseAttached', async () => {
    // Arrange
    const cause = new Error('bad data');
    const createImageBitmap = vi.fn().mockRejectedValue(cause);

    // Act / Assert
    await expect(
      loadImage(makeFile('broken.png', 'image/png'), { createImageBitmap }),
    ).rejects.toMatchObject({ cause });
  });

  it.each([
    ['FileMissing', undefined, { createImageBitmap: () => {} }, TypeError],
    [
      'FileNotAFile',
      { name: 'a.png', type: 'image/png' },
      { createImageBitmap: () => {} },
      TypeError,
    ],
    ['OptionsMissing', makeFile('a.png', 'image/png'), undefined, TypeError],
    [
      'CreateImageBitmapNotFunction',
      makeFile('a.png', 'image/png'),
      { createImageBitmap: 1 },
      TypeError,
    ],
  ])('%s_Rejects', async (_name, file, options, errorType) => {
    // Act / Assert
    await expect(loadImage(file, options)).rejects.toThrow(errorType);
  });
});
