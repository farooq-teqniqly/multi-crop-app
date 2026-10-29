import { describe, expect, it } from 'vitest';
import { buildCropFilename } from '../../src/crops/crop-filename.js';
import { PALETTE } from '../../src/crops/crop-palette.js';

describe('buildCropFilename', () => {
  it('NameExtensionAndColor_ReturnsNameUnderscoreColorDotExtension', () => {
    // Arrange
    const args = ['photo', 'png', 'red'];

    // Act
    const result = buildCropFilename(...args);

    // Assert
    expect(result).toBe('photo_red.png');
  });

  it('EveryPaletteColor_ReturnsDistinctFilenames', () => {
    // Arrange
    const names = PALETTE.map((color) =>
      buildCropFilename('photo', 'png', color.name),
    );

    // Act
    const distinct = new Set(names);

    // Assert
    expect(PALETTE).toHaveLength(20);
    expect(distinct.size).toBe(20);
  });

  it.each([
    ['imageName', [1, 'png', 'red'], TypeError],
    ['extension', ['photo', null, 'red'], TypeError],
    ['colorName', ['photo', 'png', undefined], TypeError],
    ['imageName', ['', 'png', 'red'], RangeError],
    ['extension', ['photo', '', 'red'], RangeError],
    ['colorName', ['photo', 'png', ''], RangeError],
  ])('Invalid%s_Throws', (name, args, errorType) => {
    // Arrange
    const call = () => buildCropFilename(...args);

    // Act / Assert
    expect(call).toThrow(errorType);
    expect(call).toThrow(name);
  });
});
