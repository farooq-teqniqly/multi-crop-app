import { describe, expect, it, vi } from 'vitest';
import { createCropInteraction } from '../../src/crops/crop-interaction.js';
import { createCropStore } from '../../src/crops/crop-store.js';

const GEOMETRY = {
  displaySize: { width: 500, height: 250 },
  imageSize: { width: 1000, height: 500 },
};

function createHarness(getGeometry = () => GEOMETRY) {
  const listeners = new Map();
  const canvas = {
    dataset: {},
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture: vi.fn(),
  };
  const store = createCropStore();
  const onDraftChange = vi.fn();
  const interaction = createCropInteraction({
    canvas,
    store,
    getGeometry,
    onDraftChange,
    onLimitReached: vi.fn(),
  });
  const fire = (type, x, y, pointerId = 1) =>
    listeners.get(type)({ clientX: x, clientY: y, pointerId, button: 0 });
  return { store, interaction, onDraftChange, fire };
}

describe('createCropInteraction', () => {
  it('DragOnEmptyArea_AddsCropInImageCoordinates', () => {
    // Arrange
    const { store, fire } = createHarness();

    // Act
    fire('pointerdown', 50, 50);
    fire('pointermove', 100, 100);
    fire('pointerup', 100, 100);

    // Assert
    expect(store.snapshot().crops).toMatchObject([
      { x: 100, y: 100, width: 100, height: 100 },
    ]);
  });

  it('PointerUpFromOtherPointer_IgnoresItAndKeepsGesture', () => {
    // Arrange
    const { store, fire } = createHarness();
    fire('pointerdown', 50, 50, 1);
    fire('pointermove', 100, 100, 1);

    // Act
    fire('pointerdown', 300, 200, 2);
    fire('pointerup', 310, 210, 2);
    fire('pointerup', 100, 100, 1);

    // Assert
    expect(store.snapshot().crops).toMatchObject([
      { x: 100, y: 100, width: 100, height: 100 },
    ]);
  });

  it('DisplayResizedMidDrag_KeepsDragStartInImageCoordinates', () => {
    // Arrange
    let geometry = GEOMETRY;
    const { store, fire } = createHarness(() => geometry);
    fire('pointerdown', 50, 50);
    fire('pointermove', 100, 100);

    // Act
    geometry = { ...GEOMETRY, displaySize: { width: 250, height: 125 } };
    fire('pointerup', 50, 50);

    // Assert
    expect(store.snapshot().crops).toMatchObject([
      { x: 100, y: 100, width: 100, height: 100 },
    ]);
  });

  it('SecondPointerDown_DoesNotReplaceActiveGesture', () => {
    // Arrange
    const { store, fire } = createHarness();
    fire('pointerdown', 50, 50, 1);

    // Act
    fire('pointerdown', 300, 200, 2);
    fire('pointermove', 100, 100, 1);
    fire('pointerup', 100, 100, 1);

    // Assert
    expect(store.snapshot().crops).toMatchObject([{ x: 100, y: 100 }]);
  });

  it('CancelDuringDraw_DropsGestureAndClearsDraft', () => {
    // Arrange
    const { store, interaction, onDraftChange, fire } = createHarness();
    fire('pointerdown', 50, 50);
    fire('pointermove', 100, 100);

    // Act
    interaction.cancel();
    fire('pointerup', 100, 100);

    // Assert
    expect(store.snapshot().crops).toEqual([]);
    expect(onDraftChange).toHaveBeenLastCalledWith(null);
  });

  it('CancelWithoutGesture_DoesNothing', () => {
    // Arrange
    const { interaction, onDraftChange } = createHarness();

    // Act
    interaction.cancel();

    // Assert
    expect(onDraftChange).not.toHaveBeenCalled();
  });
});
