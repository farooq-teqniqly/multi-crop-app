import { describe, expect, it } from 'vitest';
import {
  HANDLE_NAMES,
  MIN_CROP_SIZE,
  MIN_DRAG_DISTANCE,
  clampToBounds,
  deleteControlRect,
  displayToImage,
  handlePositions,
  hitTest,
  imageToDisplay,
  isClick,
  rectFromDrag,
  rectToDisplay,
  resizeByHandle,
} from '../../src/crops/crop-geometry.js';

const BOUNDS = { width: 1000, height: 500 };
const DISPLAY = { width: 500, height: 250 };

describe('constants', () => {
  it('Constants_HaveDocumentedValues', () => {
    // Arrange / Act / Assert
    expect(MIN_DRAG_DISTANCE).toBe(4);
    expect(MIN_CROP_SIZE).toBe(4);
  });
});

describe('displayToImage and imageToDisplay', () => {
  it('DisplayPoint_ScalesToImagePixels', () => {
    // Arrange
    const point = { x: 100, y: 50 };

    // Act
    const result = displayToImage(point, DISPLAY, BOUNDS);

    // Assert
    expect(result).toEqual({ x: 200, y: 100 });
  });

  it('ImagePoint_ScalesToDisplayPixels', () => {
    // Arrange
    const point = { x: 200, y: 100 };

    // Act
    const result = imageToDisplay(point, DISPLAY, BOUNDS);

    // Assert
    expect(result).toEqual({ x: 100, y: 50 });
  });

  it('NonIntegerRatio_RoundTripsWithinTolerance', () => {
    // Arrange
    const image = { width: 3000, height: 2000 };
    const display = { width: 800, height: 533 };
    const point = { x: 123.4, y: 321.9 };

    // Act
    const result = imageToDisplay(
      displayToImage(point, display, image),
      display,
      image,
    );

    // Assert
    expect(result.x).toBeCloseTo(point.x, 6);
    expect(result.y).toBeCloseTo(point.y, 6);
  });
});

describe('rectToDisplay', () => {
  it('ImageRect_ScalesPositionAndSize', () => {
    // Arrange
    const rect = { x: 200, y: 100, width: 400, height: 200 };

    // Act
    const result = rectToDisplay(rect, DISPLAY, BOUNDS);

    // Assert
    expect(result).toEqual({ x: 100, y: 50, width: 200, height: 100 });
  });
});

describe('isClick', () => {
  it.each([
    ['NoMovement', { x: 10, y: 10 }, { x: 10, y: 10 }, true],
    ['BelowThreshold', { x: 10, y: 10 }, { x: 13, y: 12 }, true],
    ['AtThresholdHorizontally', { x: 10, y: 10 }, { x: 14, y: 10 }, false],
    ['AtThresholdVertically', { x: 10, y: 10 }, { x: 10, y: 6 }, false],
    ['LargeMove', { x: 10, y: 10 }, { x: 100, y: 90 }, false],
  ])('%s_ReturnsExpected', (_name, start, end, expected) => {
    // Arrange / Act
    const result = isClick(start, end);

    // Assert
    expect(result).toBe(expected);
  });
});

describe('clampToBounds', () => {
  it.each([
    [
      'InsideBounds',
      { x: 10, y: 10, width: 50, height: 50 },
      { x: 10, y: 10, width: 50, height: 50 },
    ],
    [
      'OverflowsRightAndBottom',
      { x: 950, y: 450, width: 100, height: 100 },
      { x: 950, y: 450, width: 50, height: 50 },
    ],
    [
      'OverflowsLeftAndTop',
      { x: -20, y: -30, width: 100, height: 100 },
      { x: 0, y: 0, width: 80, height: 70 },
    ],
    [
      'EntirelyOutside',
      { x: 2000, y: 2000, width: 10, height: 10 },
      { x: 1000, y: 500, width: 0, height: 0 },
    ],
  ])('%s_ReturnsIntersectionWithBounds', (_name, rect, expected) => {
    // Arrange / Act
    const result = clampToBounds(rect, BOUNDS);

    // Assert
    expect(result).toEqual(expected);
  });
});

describe('rectFromDrag', () => {
  it.each([
    ['DownRight', { x: 100, y: 100 }, { x: 200, y: 150 }],
    ['DownLeft', { x: 200, y: 100 }, { x: 100, y: 150 }],
    ['UpRight', { x: 100, y: 150 }, { x: 200, y: 100 }],
    ['UpLeft', { x: 200, y: 150 }, { x: 100, y: 100 }],
  ])('Drag%s_ReturnsNormalizedRect', (_name, start, end) => {
    // Arrange / Act
    const result = rectFromDrag(start, end, BOUNDS);

    // Assert
    expect(result).toEqual({ x: 100, y: 100, width: 100, height: 50 });
  });

  it('DragPastImageEdge_ClampsToBounds', () => {
    // Arrange
    const start = { x: 900, y: 400 };
    const end = { x: 1200, y: 700 };

    // Act
    const result = rectFromDrag(start, end, BOUNDS);

    // Assert
    expect(result).toEqual({ x: 900, y: 400, width: 100, height: 100 });
  });

  it.each([
    ['NarrowDrag', { x: 10, y: 10 }, { x: 12, y: 50 }],
    ['ShortDrag', { x: 10, y: 10 }, { x: 50, y: 12 }],
    ['PointDrag', { x: 10, y: 10 }, { x: 10, y: 10 }],
    ['ClampedToSliver', { x: 998, y: 10 }, { x: 1200, y: 100 }],
  ])('%s_ReturnsNull', (_name, start, end) => {
    // Arrange / Act
    const result = rectFromDrag(start, end, BOUNDS);

    // Assert
    expect(result).toBeNull();
  });
});

describe('resizeByHandle', () => {
  const rect = { x: 100, y: 100, width: 200, height: 100 };

  it.each([
    ['nw', { x: 50, y: 60 }, { x: 50, y: 60, width: 250, height: 140 }],
    ['n', { x: 999, y: 60 }, { x: 100, y: 60, width: 200, height: 140 }],
    ['ne', { x: 350, y: 60 }, { x: 100, y: 60, width: 250, height: 140 }],
    ['e', { x: 350, y: 999 }, { x: 100, y: 100, width: 250, height: 100 }],
    ['se', { x: 350, y: 260 }, { x: 100, y: 100, width: 250, height: 160 }],
    ['s', { x: 0, y: 260 }, { x: 100, y: 100, width: 200, height: 160 }],
    ['sw', { x: 50, y: 260 }, { x: 50, y: 100, width: 250, height: 160 }],
    ['w', { x: 50, y: 0 }, { x: 50, y: 100, width: 250, height: 100 }],
  ])('Handle%s_MovesOnlyItsEdges', (handle, point, expected) => {
    // Arrange / Act
    const result = resizeByHandle(rect, handle, point, BOUNDS);

    // Assert
    expect(result).toEqual(expected);
  });

  it.each([
    ['se', { x: 2000, y: 2000 }, { x: 100, y: 100, width: 900, height: 400 }],
    ['nw', { x: -50, y: -50 }, { x: 0, y: 0, width: 300, height: 200 }],
  ])('Handle%s_PastImageEdge_ClampsToBounds', (handle, point, expected) => {
    // Arrange / Act
    const result = resizeByHandle(rect, handle, point, BOUNDS);

    // Assert
    expect(result).toEqual(expected);
  });

  it.each([
    ['w', { x: 500, y: 0 }, { x: 296, y: 100, width: 4, height: 100 }],
    ['n', { x: 0, y: 500 }, { x: 100, y: 196, width: 200, height: 4 }],
    ['e', { x: 0, y: 0 }, { x: 100, y: 100, width: 4, height: 100 }],
    ['s', { x: 0, y: 0 }, { x: 100, y: 100, width: 200, height: 4 }],
    ['se', { x: 0, y: 0 }, { x: 100, y: 100, width: 4, height: 4 }],
    ['nw', { x: 999, y: 999 }, { x: 296, y: 196, width: 4, height: 4 }],
  ])(
    'Handle%s_DraggedPastOppositeEdge_StopsAtMinimumSize',
    (handle, point, expected) => {
      // Arrange / Act
      const result = resizeByHandle(rect, handle, point, BOUNDS);

      // Assert
      expect(result).toEqual(expected);
    },
  );
});

describe('handlePositions', () => {
  it('Rect_ReturnsAllEightHandlePoints', () => {
    // Arrange
    const rect = { x: 0, y: 0, width: 100, height: 50 };

    // Act
    const result = handlePositions(rect);

    // Assert
    expect(Object.keys(result).toSorted()).toEqual(
      [...HANDLE_NAMES].toSorted(),
    );
    expect(result).toEqual({
      nw: { x: 0, y: 0 },
      n: { x: 50, y: 0 },
      ne: { x: 100, y: 0 },
      e: { x: 100, y: 25 },
      se: { x: 100, y: 50 },
      s: { x: 50, y: 50 },
      sw: { x: 0, y: 50 },
      w: { x: 0, y: 25 },
    });
  });
});

describe('deleteControlRect', () => {
  it.each([
    [
      'RoomAboveRect',
      { x: 50, y: 100, width: 100, height: 50 },
      { x: 141, y: 78, width: 18, height: 18 },
    ],
    [
      'RectAtTopEdge',
      { x: 50, y: 0, width: 100, height: 50 },
      { x: 141, y: 0, width: 18, height: 18 },
    ],
    [
      'RectAtRightEdge',
      { x: 400, y: 100, width: 100, height: 50 },
      { x: 482, y: 78, width: 18, height: 18 },
    ],
  ])('%s_ReturnsControlInsideDisplay', (_name, displayRect, expected) => {
    // Arrange / Act
    const result = deleteControlRect(displayRect, DISPLAY);

    // Assert
    expect(result).toEqual(expected);
  });
});

describe('hitTest', () => {
  const cropA = { id: 'a', x: 200, y: 200, width: 200, height: 100 };
  const cropB = { id: 'b', x: 300, y: 200, width: 200, height: 100 };
  const cropC = { id: 'c', x: 380, y: 150, width: 100, height: 100 };

  function hit(point, crops, selectedId) {
    return hitTest(point, {
      crops,
      selectedId,
      displaySize: DISPLAY,
      imageSize: BOUNDS,
    });
  }

  it('PointOnEmptyArea_ReturnsNone', () => {
    // Arrange / Act
    const result = hit({ x: 10, y: 10 }, [cropA], null);

    // Assert
    expect(result).toEqual({ type: 'none' });
  });

  it('PointInsideRect_ReturnsBody', () => {
    // Arrange / Act
    const result = hit({ x: 150, y: 125 }, [cropA], null);

    // Assert
    expect(result).toEqual({ type: 'body', id: 'a' });
  });

  it('OverlappingRects_ReturnsNewestBody', () => {
    // Arrange / Act
    const result = hit({ x: 175, y: 125 }, [cropA, cropB], null);

    // Assert
    expect(result).toEqual({ type: 'body', id: 'b' });
  });

  it('OverlappingRectsWithOlderSelected_ReturnsNewestBody', () => {
    // Arrange / Act
    const result = hit({ x: 175, y: 125 }, [cropA, cropB], 'a');

    // Assert
    expect(result).toEqual({ type: 'body', id: 'b' });
  });

  it('SelectedRectHandleUnderNewerRect_ReturnsHandle', () => {
    // Arrange / Act
    const result = hit({ x: 200, y: 125 }, [cropA, cropB], 'a');

    // Assert
    expect(result).toEqual({ type: 'handle', id: 'a', handle: 'e' });
  });

  it('SelectedRectHandleJustOutsideBody_ReturnsHandle', () => {
    // Arrange / Act
    const result = hit({ x: 203, y: 153 }, [cropA], 'a');

    // Assert
    expect(result).toEqual({ type: 'handle', id: 'a', handle: 'se' });
  });

  it('UnselectedRectCornerJustOutsideBody_ReturnsNone', () => {
    // Arrange / Act
    const result = hit({ x: 203, y: 153 }, [cropA], null);

    // Assert
    expect(result).toEqual({ type: 'none' });
  });

  it('DeleteControlOfSelectedRect_ReturnsDelete', () => {
    // Arrange / Act
    const result = hit({ x: 200, y: 87 }, [cropA], 'a');

    // Assert
    expect(result).toEqual({ type: 'delete', id: 'a' });
  });

  it('DeleteControlUnderNewerRect_ReturnsDelete', () => {
    // Arrange / Act
    const result = hit({ x: 200, y: 87 }, [cropA, cropC], 'a');

    // Assert
    expect(result).toEqual({ type: 'delete', id: 'a' });
  });

  it.each([
    [
      'TopEdgeCrop',
      { id: 'top', x: 200, y: 0, width: 200, height: 100 },
      200,
      0,
    ],
    [
      'NarrowCropBelowControl',
      { id: 'narrow', x: 200, y: 200, width: 10, height: 100 },
      103,
      95,
    ],
  ])('%s_HandleOverlappingDeleteControl_ReturnsHandle', (_name, crop, x, y) => {
    // Arrange / Act
    const result = hit({ x, y }, [crop], crop.id);

    // Assert
    expect(result.type).toBe('handle');
  });

  it('DeleteControlOfUnselectedRect_DoesNotHit', () => {
    // Arrange / Act
    const result = hit({ x: 200, y: 87 }, [cropA], null);

    // Assert
    expect(result).toEqual({ type: 'none' });
  });

  it('SelectedIdMatchesNoRect_FallsBackToBodies', () => {
    // Arrange / Act
    const result = hit({ x: 150, y: 125 }, [cropA], 'missing');

    // Assert
    expect(result).toEqual({ type: 'body', id: 'a' });
  });

  it('CloseHandles_ReturnsNearest', () => {
    // Arrange
    const tiny = { id: 't', x: 200, y: 200, width: 16, height: 16 };

    // Act
    const result = hit({ x: 104, y: 100 }, [tiny], 't');

    // Assert
    expect(result).toEqual({ type: 'handle', id: 't', handle: 'n' });
  });
});

describe('argument guards', () => {
  const rect = { x: 0, y: 0, width: 10, height: 10 };
  const point = { x: 1, y: 1 };
  const hitOptions = {
    crops: [],
    selectedId: null,
    displaySize: DISPLAY,
    imageSize: BOUNDS,
  };

  it.each([
    [
      'DisplayToImagePointMissing',
      () => displayToImage(null, DISPLAY, BOUNDS),
      TypeError,
    ],
    [
      'DisplayToImagePointXString',
      () => displayToImage({ x: '1', y: 1 }, DISPLAY, BOUNDS),
      TypeError,
    ],
    [
      'DisplayToImagePointNotFinite',
      () => displayToImage({ x: Infinity, y: 1 }, DISPLAY, BOUNDS),
      RangeError,
    ],
    [
      'DisplayToImageSizeMissing',
      () => displayToImage(point, null, BOUNDS),
      TypeError,
    ],
    [
      'DisplayToImageSizeZero',
      () => displayToImage(point, { width: 0, height: 5 }, BOUNDS),
      RangeError,
    ],
    [
      'DisplayToImageImageSizeZero',
      () => displayToImage(point, DISPLAY, { width: 5, height: 0 }),
      RangeError,
    ],
    [
      'ImageToDisplayPointMissing',
      () => imageToDisplay(undefined, DISPLAY, BOUNDS),
      TypeError,
    ],
    [
      'ImageToDisplaySizeMissing',
      () => imageToDisplay(point, DISPLAY, null),
      TypeError,
    ],
    [
      'RectToDisplayRectMissing',
      () => rectToDisplay(null, DISPLAY, BOUNDS),
      TypeError,
    ],
    [
      'RectToDisplayWidthNegative',
      () =>
        rectToDisplay({ x: 0, y: 0, width: -1, height: 1 }, DISPLAY, BOUNDS),
      RangeError,
    ],
    ['IsClickStartMissing', () => isClick(null, point), TypeError],
    ['IsClickEndMissing', () => isClick(point, null), TypeError],
    ['ClampRectMissing', () => clampToBounds(null, BOUNDS), TypeError],
    ['ClampBoundsMissing', () => clampToBounds(rect, null), TypeError],
    [
      'ClampBoundsZero',
      () => clampToBounds(rect, { width: 0, height: 0 }),
      RangeError,
    ],
    [
      'RectFromDragStartMissing',
      () => rectFromDrag(null, point, BOUNDS),
      TypeError,
    ],
    [
      'RectFromDragEndMissing',
      () => rectFromDrag(point, null, BOUNDS),
      TypeError,
    ],
    [
      'RectFromDragBoundsMissing',
      () => rectFromDrag(point, point, null),
      TypeError,
    ],
    [
      'ResizeRectMissing',
      () => resizeByHandle(null, 'n', point, BOUNDS),
      TypeError,
    ],
    [
      'ResizeHandleNotString',
      () => resizeByHandle(rect, 5, point, BOUNDS),
      TypeError,
    ],
    [
      'ResizeHandleUnknown',
      () => resizeByHandle(rect, 'up', point, BOUNDS),
      RangeError,
    ],
    [
      'ResizePointMissing',
      () => resizeByHandle(rect, 'n', null, BOUNDS),
      TypeError,
    ],
    [
      'ResizeBoundsMissing',
      () => resizeByHandle(rect, 'n', point, null),
      TypeError,
    ],
    ['HandlePositionsRectMissing', () => handlePositions(null), TypeError],
    [
      'DeleteControlRectMissing',
      () => deleteControlRect(null, DISPLAY),
      TypeError,
    ],
    [
      'DeleteControlSizeMissing',
      () => deleteControlRect(rect, null),
      TypeError,
    ],
    ['HitTestPointMissing', () => hitTest(null, hitOptions), TypeError],
    ['HitTestOptionsMissing', () => hitTest(point, null), TypeError],
    [
      'HitTestCropsNotArray',
      () => hitTest(point, { ...hitOptions, crops: 'x' }),
      TypeError,
    ],
    [
      'HitTestDisplaySizeMissing',
      () => hitTest(point, { ...hitOptions, displaySize: null }),
      TypeError,
    ],
    [
      'HitTestImageSizeZero',
      () =>
        hitTest(point, {
          ...hitOptions,
          imageSize: { width: 0, height: 1 },
        }),
      RangeError,
    ],
  ])('%s_Throws', (_name, act, errorType) => {
    // Arrange / Act / Assert
    expect(act).toThrow(errorType);
  });
});
