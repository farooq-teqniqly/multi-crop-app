import { describe, expect, it } from 'vitest';
import {
  isExportableExtension,
  resolveExportFormat,
} from '../../src/export/export-format.js';

describe('resolveExportFormat', () => {
  it.each([
    ['jpg', 'jpg', 'image/jpeg'],
    ['jpeg', 'jpeg', 'image/jpeg'],
    ['png', 'png', 'image/png'],
    ['gif', 'png', 'image/png'],
    ['GIF', 'png', 'image/png'],
  ])('%s_ResolvesExtensionAndMime', (input, extension, mimeType) => {
    // Act
    const format = resolveExportFormat(input);

    // Assert
    expect(format).toEqual({ extension, mimeType });
  });

  it('UnknownExtension_ThrowsRangeError', () => {
    // Act / Assert
    expect(() => resolveExportFormat('bmp')).toThrow(RangeError);
  });

  it('NonString_ThrowsTypeError', () => {
    // Act / Assert
    expect(() => resolveExportFormat(5)).toThrow(TypeError);
  });
});

describe('isExportableExtension', () => {
  it.each([
    ['jpg', true],
    ['JPEG', true],
    ['png', true],
    ['gif', true],
    ['jfif', false],
    ['', false],
    [undefined, false],
    [42, false],
  ])('%s_ReturnsExpected', (input, expected) => {
    // Act
    const result = isExportableExtension(input);

    // Assert
    expect(result).toBe(expected);
  });
});
