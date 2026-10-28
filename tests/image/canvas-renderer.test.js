import { describe, expect, it, vi } from 'vitest';
import { renderImage } from '../../src/image/canvas-renderer.js';

function createCanvas(context) {
  return { width: 0, height: 0, getContext: vi.fn().mockReturnValue(context) };
}

describe('renderImage', () => {
  it('LargeImage_DrawsScaledAndReturnsDisplaySize', () => {
    // Arrange
    const context = { drawImage: vi.fn() };
    const canvas = createCanvas(context);
    const bitmap = { width: 2000, height: 1000 };

    // Act
    const size = renderImage(canvas, bitmap, { width: 500, height: 500 });

    // Assert
    expect(size).toEqual({ width: 500, height: 250 });
    expect(canvas.width).toBe(500);
    expect(canvas.height).toBe(250);
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 500, 250);
  });

  it('SmallImage_DrawsAtNaturalSize', () => {
    // Arrange
    const context = { drawImage: vi.fn() };
    const canvas = createCanvas(context);
    const bitmap = { width: 100, height: 50 };

    // Act
    const size = renderImage(canvas, bitmap, { width: 500, height: 500 });

    // Assert
    expect(size).toEqual({ width: 100, height: 50 });
  });

  it.each([
    ['MissingCanvas', null],
    ['CanvasWithoutGetContext', {}],
  ])('%s_ThrowsTypeError', (_name, canvas) => {
    // Arrange
    const bitmap = { width: 10, height: 10 };

    // Act / Assert
    expect(() =>
      renderImage(canvas, bitmap, { width: 100, height: 100 }),
    ).toThrow(TypeError);
  });

  it.each([
    ['NullBitmap', null],
    ['NonObjectBitmap', 'bitmap'],
  ])('%s_ThrowsTypeError', (_name, bitmap) => {
    // Arrange
    const canvas = createCanvas({ drawImage: vi.fn() });

    // Act / Assert
    expect(() =>
      renderImage(canvas, bitmap, { width: 100, height: 100 }),
    ).toThrow(TypeError);
  });

  it('CanvasWithoutContext_ThrowsTypeError', () => {
    // Arrange
    const canvas = createCanvas(null);
    const bitmap = { width: 10, height: 10 };

    // Act / Assert
    expect(() =>
      renderImage(canvas, bitmap, { width: 100, height: 100 }),
    ).toThrow(TypeError);
  });

  it('NonPositivePanel_ThrowsRangeError', () => {
    // Arrange
    const canvas = createCanvas({ drawImage: vi.fn() });
    const bitmap = { width: 10, height: 10 };

    // Act / Assert
    expect(() =>
      renderImage(canvas, bitmap, { width: 0, height: 100 }),
    ).toThrow(RangeError);
  });
});
