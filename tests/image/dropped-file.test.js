import { describe, expect, it } from 'vitest';
import { pickDroppedFile } from '../../src/image/dropped-file.js';

describe('pickDroppedFile', () => {
  it('SingleFile_ReturnsThatFile', () => {
    // Arrange
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    // Act
    const result = pickDroppedFile({ files: [file] });

    // Assert
    expect(result).toBe(file);
  });

  it('MultipleFiles_ReturnsFirst', () => {
    // Arrange
    const first = new File(['x'], 'a.png', { type: 'image/png' });
    const second = new File(['y'], 'b.png', { type: 'image/png' });

    // Act
    const result = pickDroppedFile({ files: [first, second] });

    // Assert
    expect(result).toBe(first);
  });

  it('NoFiles_ReturnsNull', () => {
    // Arrange
    const dataTransfer = { files: [] };

    // Act
    const result = pickDroppedFile(dataTransfer);

    // Assert
    expect(result).toBeNull();
  });

  it.each([
    ['DataTransferMissing', undefined],
    ['DataTransferNull', null],
    ['FilesMissing', {}],
    ['FilesNotListLike', { files: 'a.png' }],
  ])('%s_ThrowsTypeError', (_name, dataTransfer) => {
    // Act / Assert
    expect(() => pickDroppedFile(dataTransfer)).toThrow(TypeError);
  });
});
