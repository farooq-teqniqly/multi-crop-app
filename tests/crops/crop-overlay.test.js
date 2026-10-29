import { describe, expect, it, vi } from 'vitest';
import { drawOverlay } from '../../src/crops/crop-overlay.js';

const SIZES = {
  displaySize: { width: 500, height: 250 },
  imageSize: { width: 1000, height: 500 },
};

function createContext() {
  return {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    setLineDash: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
}

const crop = (id) => ({
  id,
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  color: { name: 'red', hex: '#e03131' },
});

describe('drawOverlay', () => {
  it('EmptySnapshot_ClearsCanvasAndDrawsNothing', () => {
    // Arrange
    const context = createContext();

    // Act
    drawOverlay(context, { crops: [], selectedId: null }, SIZES);

    // Assert
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 500, 250);
    expect(context.strokeRect).not.toHaveBeenCalled();
  });

  it('PixelRatioGiven_ScalesTransform', () => {
    // Arrange
    const context = createContext();

    // Act
    drawOverlay(
      context,
      { crops: [], selectedId: null },
      {
        ...SIZES,
        pixelRatio: 2,
      },
    );

    // Assert
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('UnselectedCrop_StrokesRectWithoutHandles', () => {
    // Arrange
    const context = createContext();

    // Act
    drawOverlay(context, { crops: [crop(1)], selectedId: null }, SIZES);

    // Assert
    expect(context.strokeRect).toHaveBeenCalledWith(50, 50, 100, 50);
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it('SelectedCrop_DrawsHandlesAndDeleteControl', () => {
    // Arrange
    const context = createContext();

    // Act
    drawOverlay(context, { crops: [crop(1)], selectedId: 1 }, SIZES);

    // Assert
    expect(context.fillRect).toHaveBeenCalledTimes(9);
    expect(context.stroke).toHaveBeenCalledTimes(1);
  });

  it('DraftGiven_StrokesDraftRectInDisplayCoordinates', () => {
    // Arrange
    const context = createContext();

    // Act
    drawOverlay(
      context,
      { crops: [], selectedId: null },
      {
        ...SIZES,
        draft: { x: 200, y: 200, width: 100, height: 100 },
      },
    );

    // Assert
    expect(context.strokeRect).toHaveBeenCalledTimes(2);
    expect(context.strokeRect).toHaveBeenCalledWith(100, 100, 50, 50);
  });

  it.each([
    ['MissingContext', [null, { crops: [] }, SIZES]],
    ['MissingCrops', [createContext(), {}, SIZES]],
    [
      'MissingDisplaySize',
      [createContext(), { crops: [] }, { imageSize: SIZES.imageSize }],
    ],
    [
      'MissingImageSize',
      [createContext(), { crops: [] }, { displaySize: SIZES.displaySize }],
    ],
  ])('%s_ThrowsTypeError', (_name, args) => {
    // Arrange / Act / Assert
    expect(() => drawOverlay(...args)).toThrow(TypeError);
  });
});
