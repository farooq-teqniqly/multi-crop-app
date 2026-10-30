import { describe, expect, it } from 'vitest';
import { toPixelRect } from '../../src/crops/crop-region.js';

const IMAGE = { width: 100, height: 80 };

describe('toPixelRect', () => {
  it.each([
    [
      'IntegerCropInside',
      { x: 10, y: 20, width: 30, height: 40 },
      [10, 20, 30, 40],
    ],
    [
      'FractionalCrop',
      { x: 10.4, y: 20.6, width: 29.6, height: 39.2 },
      [10, 21, 30, 39],
    ],
    [
      'CropOverRightAndBottomEdge',
      { x: 90, y: 70, width: 50, height: 50 },
      [90, 70, 10, 10],
    ],
    [
      'CropWithNegativeOrigin',
      { x: -5, y: -5, width: 20, height: 20 },
      [0, 0, 15, 15],
    ],
    [
      'CropStartingAtImageEdge',
      { x: 100, y: 80, width: 10, height: 10 },
      [99, 79, 1, 1],
    ],
    ['SubPixelCrop', { x: 10, y: 10, width: 0.2, height: 0.2 }, [10, 10, 1, 1]],
  ])('%s_ReturnsClampedIntegerRect', (_name, crop, expected) => {
    // Arrange
    const [x, y, width, height] = expected;

    // Act
    const rect = toPixelRect(crop, IMAGE);

    // Assert
    expect(rect).toEqual({ x, y, width, height });
  });

  it.each([
    ['CropMissing', undefined, IMAGE, TypeError],
    [
      'CropFieldNotNumber',
      { x: '1', y: 0, width: 1, height: 1 },
      IMAGE,
      TypeError,
    ],
    [
      'CropFieldNotFinite',
      { x: 0, y: 0, width: Infinity, height: 1 },
      IMAGE,
      RangeError,
    ],
    ['ImageSizeMissing', { x: 0, y: 0, width: 1, height: 1 }, null, TypeError],
    [
      'ImageWidthNotNumber',
      { x: 0, y: 0, width: 1, height: 1 },
      { width: '1', height: 1 },
      TypeError,
    ],
    [
      'ImageHeightZero',
      { x: 0, y: 0, width: 1, height: 1 },
      { width: 1, height: 0 },
      RangeError,
    ],
  ])('%s_Throws', (_name, crop, imageSize, errorType) => {
    // Act / Assert
    expect(() => toPixelRect(crop, imageSize)).toThrow(errorType);
  });
});
