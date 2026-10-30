import { describe, expect, it } from 'vitest';
import {
  buildCropFilename,
  normalizeCropName,
  resolveCropFilename,
} from '../../src/crops/crop-filename.js';
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

describe('normalizeCropName', () => {
  it.each([
    ['hero', 'hero'],
    ['  hero  ', 'hero'],
    ['he<ro>:"/\\|?*', 'hero'],
    ['hero...', 'hero'],
    ['hero.png', 'hero'],
    ['HERO.PNG', 'HERO'],
    ['hero.jpg', 'hero.jpg'],
  ])('Input_%j_ReturnsNormalized_%j', (input, expected) => {
    // Arrange
    const extension = 'png';

    // Act
    const result = normalizeCropName(input, extension);

    // Assert
    expect(result).toBe(expected);
  });

  it.each(['', '   ', '<>:', '...', 'CON', 'nul', 'Com1', '.png'])(
    'Input_%j_ReturnsNull',
    (input) => {
      // Arrange
      const extension = 'png';

      // Act
      const result = normalizeCropName(input, extension);

      // Assert
      expect(result).toBeNull();
    },
  );

  it('OverlongName_IsTruncated', () => {
    // Arrange
    const input = 'a'.repeat(300);

    // Act
    const result = normalizeCropName(input, 'png');

    // Assert
    expect(result).toHaveLength(200);
  });

  it.each([
    [1, 'png', TypeError],
    ['a', 1, TypeError],
    ['a', '', RangeError],
  ])('Arguments_%j_%j_Throw', (name, extension, errorType) => {
    // Arrange
    const call = () => normalizeCropName(name, extension);

    // Act / Assert
    expect(call).toThrow(errorType);
  });
});

describe('resolveCropFilename', () => {
  const crop = { color: { name: 'red' }, name: null };

  it('NoCustomName_ReturnsDefaultFilename', () => {
    // Arrange
    const args = { imageName: 'photo', extension: 'png', crop };

    // Act
    const result = resolveCropFilename(args);

    // Assert
    expect(result).toBe('photo_red.png');
  });

  it('CustomName_ReturnsCustomNameWithExtension', () => {
    // Arrange
    const args = {
      imageName: 'photo',
      extension: 'jpg',
      crop: { ...crop, name: 'hero' },
    };

    // Act
    const result = resolveCropFilename(args);

    // Assert
    expect(result).toBe('hero.jpg');
  });

  it.each([null, 'x'])('InvalidOptions_%j_ThrowsTypeError', (options) => {
    // Arrange
    const call = () => resolveCropFilename(options);

    // Act / Assert
    expect(call).toThrow(TypeError);
  });

  it('CropWithoutColor_ThrowsTypeError', () => {
    // Arrange
    const call = () =>
      resolveCropFilename({ imageName: 'a', extension: 'png', crop: {} });

    // Act / Assert
    expect(call).toThrow(TypeError);
  });
});
