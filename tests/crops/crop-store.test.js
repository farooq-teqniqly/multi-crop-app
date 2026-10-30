import { describe, expect, it, vi } from 'vitest';
import { PALETTE } from '../../src/crops/crop-palette.js';
import { MAX_CROP_AREAS, createCropStore } from '../../src/crops/crop-store.js';

const RECT = { x: 10, y: 20, width: 30, height: 40 };

function fillStore(store, count) {
  for (let index = 0; index < count; index += 1) {
    store.add(RECT);
  }
}

describe('createCropStore', () => {
  it('NewStore_HasNoCropsAndNoSelection', () => {
    // Arrange / Act
    const store = createCropStore();

    // Assert
    expect(store.snapshot()).toEqual({ crops: [], selectedId: null });
  });

  it('Defaults_CapAtTwentyAreas', () => {
    // Arrange / Act
    const store = createCropStore();

    // Assert
    expect(MAX_CROP_AREAS).toBe(20);
    expect(store.maxAreas).toBe(20);
  });

  it.each([
    ['Default', undefined, PALETTE],
    [
      'Custom',
      [{ name: 'ruby', hex: '#e03131' }],
      [{ name: 'ruby', hex: '#e03131' }],
    ],
  ])('%sPalette_IsExposedOnStore', (_scenario, palette, expected) => {
    // Arrange / Act
    const store = createCropStore(palette === undefined ? {} : { palette });

    // Assert
    expect(store.palette).toEqual(expected);
  });

  it.each(['palette', 'maxAreas'])(
    'Reassigning_%s_ThrowsAndKeepsValue',
    (property) => {
      // Arrange
      const store = createCropStore();
      const original = store[property];

      // Act / Assert
      expect(() => {
        store[property] = 'changed';
      }).toThrow(TypeError);
      expect(store[property]).toBe(original);
    },
  );

  it.each([
    ['OptionsNotObject', 'x', TypeError],
    ['PaletteNotArray', { palette: 'x' }, TypeError],
    ['PaletteEmpty', { palette: [] }, RangeError],
    ['MaxAreasNotNumber', { maxAreas: '3' }, TypeError],
    ['MaxAreasZero', { maxAreas: 0 }, RangeError],
    ['MaxAreasFraction', { maxAreas: 1.5 }, RangeError],
  ])('%s_Throws', (_name, options, errorType) => {
    // Arrange / Act / Assert
    expect(() => createCropStore(options)).toThrow(errorType);
  });
});

describe('CropStore.add', () => {
  it('ValidRect_ReturnsAddedWithColoredSelectedCrop', () => {
    // Arrange
    const store = createCropStore();

    // Act
    const outcome = store.add(RECT);

    // Assert
    expect(outcome.status).toBe('added');
    expect(outcome.crop).toMatchObject({ ...RECT, color: PALETTE[0] });
    expect(store.snapshot().selectedId).toBe(outcome.crop.id);
  });

  it('TwoRects_GetDistinctIdsAndColors', () => {
    // Arrange
    const store = createCropStore();

    // Act
    const first = store.add(RECT).crop;
    const second = store.add(RECT).crop;

    // Assert
    expect(second.id).not.toBe(first.id);
    expect(second.color.name).toBe(PALETTE[1].name);
  });

  it('RemovedColor_IsReassignedToNextArea', () => {
    // Arrange
    const store = createCropStore();
    const first = store.add(RECT).crop;
    store.add(RECT);
    store.remove(first.id);

    // Act
    const third = store.add(RECT).crop;

    // Assert
    expect(third.color.name).toBe(PALETTE[0].name);
  });

  it('FullStore_ReturnsLimitReachedAndLeavesStateUnchanged', () => {
    // Arrange
    const store = createCropStore();
    fillStore(store, 20);
    const before = store.snapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    const outcome = store.add(RECT);

    // Assert
    expect(outcome).toEqual({ status: 'limit-reached', limit: 20 });
    expect(store.snapshot()).toEqual(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('TwentyAreas_UseTwentyDistinctColors', () => {
    // Arrange
    const store = createCropStore();

    // Act
    fillStore(store, 20);

    // Assert
    const names = store.snapshot().crops.map((crop) => crop.color.name);
    expect(new Set(names).size).toBe(20);
  });

  it('MoreAreasThanColors_CyclesPalette', () => {
    // Arrange
    const palette = [
      { name: 'red', hex: '#e03131' },
      { name: 'green', hex: '#2f9e44' },
    ];
    const store = createCropStore({ palette, maxAreas: 3 });

    // Act
    fillStore(store, 3);

    // Assert
    const names = store.snapshot().crops.map((crop) => crop.color.name);
    expect(names).toEqual(['red', 'green', 'red']);
  });

  it.each([
    ['RectMissing', null, TypeError],
    ['XNotNumber', { ...RECT, x: '1' }, TypeError],
    ['WidthNotNumber', { ...RECT, width: undefined }, TypeError],
    ['XNotFinite', { ...RECT, x: Number.NaN }, RangeError],
    ['WidthZero', { ...RECT, width: 0 }, RangeError],
    ['HeightNegative', { ...RECT, height: -3 }, RangeError],
  ])('%s_Throws', (_name, rect, errorType) => {
    // Arrange
    const store = createCropStore();

    // Act / Assert
    expect(() => store.add(rect)).toThrow(errorType);
  });
});

describe('CropStore.remove', () => {
  it('ExistingCrop_RemovesItAndReturnsTrue', () => {
    // Arrange
    const store = createCropStore();
    const { crop } = store.add(RECT);

    // Act
    const removed = store.remove(crop.id);

    // Assert
    expect(removed).toBe(true);
    expect(store.snapshot().crops).toEqual([]);
  });

  it('SelectedCrop_ClearsSelection', () => {
    // Arrange
    const store = createCropStore();
    const { crop } = store.add(RECT);

    // Act
    store.remove(crop.id);

    // Assert
    expect(store.snapshot().selectedId).toBeNull();
  });

  it('UnselectedCrop_KeepsSelection', () => {
    // Arrange
    const store = createCropStore();
    const first = store.add(RECT).crop;
    const second = store.add(RECT).crop;

    // Act
    store.remove(first.id);

    // Assert
    expect(store.snapshot().selectedId).toBe(second.id);
  });

  it('UnknownId_ReturnsFalseWithoutNotifying', () => {
    // Arrange
    const store = createCropStore();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    const removed = store.remove('missing');

    // Assert
    expect(removed).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('FullStoreAfterRemoval_AllowsAddingAgain', () => {
    // Arrange
    const store = createCropStore();
    fillStore(store, 20);
    store.remove(store.snapshot().crops[0].id);

    // Act
    const outcome = store.add(RECT);

    // Assert
    expect(outcome.status).toBe('added');
  });

  it('IdNotString_Throws', () => {
    // Arrange
    const store = createCropStore();

    // Act / Assert
    expect(() => store.remove(5)).toThrow(TypeError);
  });
});

describe('CropStore.select', () => {
  it('ExistingCrop_SelectsIt', () => {
    // Arrange
    const store = createCropStore();
    const first = store.add(RECT).crop;
    store.add(RECT);

    // Act
    store.select(first.id);

    // Assert
    expect(store.snapshot().selectedId).toBe(first.id);
  });

  it('Null_ClearsSelection', () => {
    // Arrange
    const store = createCropStore();
    store.add(RECT);

    // Act
    store.select(null);

    // Assert
    expect(store.snapshot().selectedId).toBeNull();
  });

  it('UnknownId_LeavesSelectionUnchanged', () => {
    // Arrange
    const store = createCropStore();
    const { crop } = store.add(RECT);

    // Act
    store.select('missing');

    // Assert
    expect(store.snapshot().selectedId).toBe(crop.id);
  });

  it('AlreadySelected_DoesNotNotify', () => {
    // Arrange
    const store = createCropStore();
    const { crop } = store.add(RECT);
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    store.select(crop.id);

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('IdNotStringOrNull_Throws', () => {
    // Arrange
    const store = createCropStore();

    // Act / Assert
    expect(() => store.select(3)).toThrow(TypeError);
  });
});

describe('CropStore.resize', () => {
  it('ExistingCrop_UpdatesBoundsAndKeepsColor', () => {
    // Arrange
    const store = createCropStore();
    const { crop } = store.add(RECT);
    const bounds = { x: 1, y: 2, width: 3, height: 4 };

    // Act
    const resized = store.resize(crop.id, bounds);

    // Assert
    expect(resized).toBe(true);
    expect(store.snapshot().crops[0]).toMatchObject({
      ...bounds,
      id: crop.id,
      color: crop.color,
    });
  });

  it('UnknownId_ReturnsFalse', () => {
    // Arrange
    const store = createCropStore();

    // Act
    const resized = store.resize('missing', RECT);

    // Assert
    expect(resized).toBe(false);
  });

  it.each([
    ['IdNotString', 5, RECT, TypeError],
    ['RectMissing', 'crop-1', null, TypeError],
    ['HeightZero', 'crop-1', { ...RECT, height: 0 }, RangeError],
  ])('%s_Throws', (_name, id, rect, errorType) => {
    // Arrange
    const store = createCropStore();
    store.add(RECT);

    // Act / Assert
    expect(() => store.resize(id, rect)).toThrow(errorType);
  });
});

describe('CropStore.clear', () => {
  it('StoreWithCrops_RemovesAllAndSelection', () => {
    // Arrange
    const store = createCropStore();
    fillStore(store, 3);

    // Act
    store.clear();

    // Assert
    expect(store.snapshot()).toEqual({ crops: [], selectedId: null });
  });

  it('EmptyStore_DoesNotNotify', () => {
    // Arrange
    const store = createCropStore();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    store.clear();

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('CropStore.snapshot', () => {
  it('Snapshot_IsDeeplyFrozen', () => {
    // Arrange
    const store = createCropStore();
    store.add(RECT);

    // Act
    const snapshot = store.snapshot();

    // Assert
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.crops)).toBe(true);
    expect(Object.isFrozen(snapshot.crops[0])).toBe(true);
  });

  it('EarlierSnapshot_IsNotAffectedByLaterChanges', () => {
    // Arrange
    const store = createCropStore();
    const before = store.snapshot();

    // Act
    store.add(RECT);

    // Assert
    expect(before.crops).toEqual([]);
  });
});

describe('CropStore.subscribe', () => {
  it('Change_NotifiesListenerWithSnapshot', () => {
    // Arrange
    const store = createCropStore();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    store.add(RECT);

    // Assert
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(store.snapshot());
  });

  it('Unsubscribe_StopsNotifications', () => {
    // Arrange
    const store = createCropStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    // Act
    store.add(RECT);

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('ListenerNotFunction_Throws', () => {
    // Arrange
    const store = createCropStore();

    // Act / Assert
    expect(() => store.subscribe('x')).toThrow(TypeError);
  });
});

describe('createCropStore.rename', () => {
  it('NewCropArea_HasNoCustomName', () => {
    // Arrange
    const store = createCropStore();

    // Act
    const { crop } = store.add(RECT);

    // Assert
    expect(crop.name).toBeNull();
  });

  it('KnownId_SetsNameKeepsSelectionAndNotifiesOnce', () => {
    // Arrange
    const store = createCropStore();
    const { crop } = store.add(RECT);
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    const renamed = store.rename(crop.id, 'hero');

    // Assert
    const snapshot = store.snapshot();
    expect(renamed).toBe(true);
    expect(snapshot.crops[0].name).toBe('hero');
    expect(snapshot.selectedId).toBe(crop.id);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('NullName_RestoresDefault', () => {
    // Arrange
    const store = createCropStore();
    const { crop } = store.add(RECT);
    store.rename(crop.id, 'hero');

    // Act
    store.rename(crop.id, null);

    // Assert
    expect(store.snapshot().crops[0].name).toBeNull();
  });

  it('UnknownId_ReturnsFalseWithoutNotifying', () => {
    // Arrange
    const store = createCropStore();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    const renamed = store.rename('missing', 'hero');

    // Assert
    expect(renamed).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('ResizeAfterRename_KeepsName', () => {
    // Arrange
    const store = createCropStore();
    const { crop } = store.add(RECT);
    store.rename(crop.id, 'hero');

    // Act
    store.resize(crop.id, { x: 1, y: 1, width: 5, height: 5 });

    // Assert
    expect(store.snapshot().crops[0].name).toBe('hero');
  });

  it.each([
    [1, 'hero', TypeError],
    ['crop-1', 5, TypeError],
    ['crop-1', '', RangeError],
  ])('Arguments_%j_%j_Throw', (id, name, errorType) => {
    // Arrange
    const store = createCropStore();

    // Act / Assert
    expect(() => store.rename(id, name)).toThrow(errorType);
  });
});
