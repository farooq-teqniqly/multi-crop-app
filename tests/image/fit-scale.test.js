import { describe, expect, it } from 'vitest';
import {
  computeAvailableHeight,
  computeDisplaySize,
  computeFitScale,
} from '../../src/image/fit-scale.js';

describe('computeFitScale', () => {
  it.each([
    [
      'ImageSmallerThanPanel',
      { width: 400, height: 300 },
      { width: 800, height: 600 },
      1,
    ],
    [
      'ImageExactlyFitsPanel',
      { width: 800, height: 600 },
      { width: 800, height: 600 },
      1,
    ],
    [
      'ImageWiderThanPanel',
      { width: 1600, height: 600 },
      { width: 800, height: 600 },
      0.5,
    ],
    [
      'ImageTallerThanPanel',
      { width: 400, height: 1200 },
      { width: 800, height: 600 },
      0.5,
    ],
    [
      'ImageLargerInBothAxes',
      { width: 4000, height: 3000 },
      { width: 800, height: 750 },
      0.2,
    ],
  ])('%s_ReturnsExpectedScale', (_name, image, panel, expected) => {
    // Arrange / Act
    const scale = computeFitScale(image, panel);

    // Assert
    expect(scale).toBeCloseTo(expected);
  });

  it.each([
    ['ImageMissing', undefined, { width: 10, height: 10 }, TypeError],
    ['PanelMissing', { width: 10, height: 10 }, undefined, TypeError],
    [
      'ImageWidthNotNumber',
      { width: '10', height: 10 },
      { width: 10, height: 10 },
      TypeError,
    ],
    [
      'PanelHeightNotNumber',
      { width: 10, height: 10 },
      { width: 10, height: null },
      TypeError,
    ],
    [
      'ImageWidthZero',
      { width: 0, height: 10 },
      { width: 10, height: 10 },
      RangeError,
    ],
    [
      'ImageHeightNegative',
      { width: 10, height: -1 },
      { width: 10, height: 10 },
      RangeError,
    ],
    [
      'PanelWidthZero',
      { width: 10, height: 10 },
      { width: 0, height: 10 },
      RangeError,
    ],
    [
      'PanelHeightNaN',
      { width: 10, height: 10 },
      { width: 10, height: NaN },
      RangeError,
    ],
  ])('%s_Throws', (_name, image, panel, errorType) => {
    // Act / Assert
    expect(() => computeFitScale(image, panel)).toThrow(errorType);
  });
});

describe('computeDisplaySize', () => {
  it.each([
    [
      'ImageSmallerThanPanel',
      { width: 400, height: 300 },
      { width: 800, height: 600 },
      { width: 400, height: 300 },
    ],
    [
      'ImageLargerThanPanel',
      { width: 4000, height: 3000 },
      { width: 800, height: 600 },
      { width: 800, height: 600 },
    ],
    [
      'FractionalResultRounds',
      { width: 1001, height: 333 },
      { width: 500, height: 500 },
      { width: 500, height: 166 },
    ],
  ])('%s_ReturnsDisplaySize', (_name, image, panel, expected) => {
    // Arrange / Act
    const size = computeDisplaySize(image, panel);

    // Assert
    expect(size).toEqual(expected);
  });

  it('InvalidImage_Throws', () => {
    // Act / Assert
    expect(() => computeDisplaySize(null, { width: 10, height: 10 })).toThrow(
      TypeError,
    );
  });

  it('TinyImageWideShrink_NeverReturnsZeroDimension', () => {
    // Arrange
    const image = { width: 10000, height: 1 };
    const panel = { width: 100, height: 100 };

    // Act
    const size = computeDisplaySize(image, panel);

    // Assert
    expect(size.height).toBeGreaterThanOrEqual(1);
  });
});

describe('computeAvailableHeight', () => {
  it.each([
    ['PanelNearTop_FillsViewportBelowIt', 900, 100, 24, 776],
    ['PanelBelowFold_UsesFloorNotSliver', 900, 1200, 24, 240],
    ['ShortViewport_UsesFloor', 200, 50, 24, 240],
  ])('%s', (_name, viewportHeight, panelTop, margin, expected) => {
    // Act
    const height = computeAvailableHeight(viewportHeight, panelTop, margin);

    // Assert
    expect(height).toBe(expected);
  });

  it.each([
    ['ViewportHeightNotNumber', '900', 0, TypeError],
    ['PanelTopNotNumber', 900, undefined, TypeError],
    ['ViewportHeightNotFinite', Number.POSITIVE_INFINITY, 0, RangeError],
    ['PanelTopNotFinite', 900, Number.NaN, RangeError],
  ])('%s_Throws', (_name, viewportHeight, panelTop, errorType) => {
    // Act / Assert
    expect(() => computeAvailableHeight(viewportHeight, panelTop)).toThrow(
      errorType,
    );
  });
});
