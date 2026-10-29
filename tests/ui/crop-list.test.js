// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createCropStore } from '../../src/crops/crop-store.js';
import { createCropList } from '../../src/ui/crop-list.js';

const RECT = { x: 0, y: 0, width: 10, height: 10 };

afterEach(() => {
  document.body.replaceChildren();
});

function setup({ image = { name: 'photo', extension: 'png' } } = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const store = createCropStore();
  const state = { image };
  const list = createCropList({
    container,
    document,
    store,
    getImage: () => state.image,
  });
  return { container, store, list, state };
}

function rowButton(container, id) {
  return container.querySelector(`[data-testid="crop-row-${id}"]`);
}

function deleteButton(container, id) {
  return container.querySelector(`[data-testid="crop-delete-${id}"]`);
}

describe('createCropList', () => {
  it('NoCropAreas_ShowsEmptyState', () => {
    // Arrange
    const { container } = setup();

    // Act
    const text = container.textContent;

    // Assert
    expect(text).toContain('No crop areas yet');
    expect(container.querySelectorAll('li.list-group-item')).toHaveLength(0);
  });

  it('CropAreaAdded_RowShowsFilenameAndSwatchColor', () => {
    // Arrange
    const { container, store } = setup();

    // Act
    const { crop } = store.add(RECT);

    // Assert
    const button = rowButton(container, crop.id);
    expect(button.textContent).toContain('photo_red.png');
    const swatch = button.querySelector('.crop-swatch');
    expect(swatch.style.getPropertyValue('--crop-swatch-color')).toBe(
      crop.color.hex,
    );
  });

  it('TwentyCropAreas_RowsShowTwentyDistinctFilenamesOldestFirst', () => {
    // Arrange
    const { container, store } = setup();

    // Act
    for (let index = 0; index < 20; index += 1) {
      store.add(RECT);
    }

    // Assert
    const rows = [...container.querySelectorAll('[data-testid^="crop-row-"]')];
    const labels = rows.map((button) => button.textContent.trim());
    expect(new Set(labels).size).toBe(20);
    expect(labels[0]).toBe('photo_red.png');
    expect(labels[1]).toBe('photo_green.png');
  });

  it('CropAreaAdded_SelectedRowIsActiveAndAriaCurrent', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;

    // Act
    const second = store.add(RECT).crop;

    // Assert
    const selected = rowButton(container, second.id);
    const other = rowButton(container, first.id);
    expect(selected.classList).toContain('active');
    expect(selected.classList).toContain('list-group-item-action');
    expect(selected.getAttribute('aria-current')).toBe('true');
    expect(other.classList).not.toContain('active');
    expect(other.hasAttribute('aria-current')).toBe(false);
  });

  it('RowClicked_SelectsMatchingCropArea', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;
    store.add(RECT);

    // Act
    rowButton(container, first.id).click();

    // Assert
    expect(store.snapshot().selectedId).toBe(first.id);
    expect(rowButton(container, first.id).classList).toContain('active');
  });

  it('StoreSelect_HighlightsMatchingRow', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;
    store.add(RECT);

    // Act
    store.select(first.id);

    // Assert
    expect(rowButton(container, first.id).classList).toContain('active');
  });

  it('DeleteClicked_RemovesAreaFromStoreWithoutSelectingIt', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;
    const second = store.add(RECT).crop;
    store.select(null);

    // Act
    deleteButton(container, first.id).click();

    // Assert
    expect(store.snapshot().crops.map((crop) => crop.id)).toEqual([second.id]);
    expect(store.snapshot().selectedId).toBeNull();
    expect(rowButton(container, first.id)).toBeNull();
  });

  it('SelectFromFocusedRow_KeepsFocusOnSameRow', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;
    store.add(RECT);
    rowButton(container, first.id).focus();

    // Act
    rowButton(container, first.id).click();

    // Assert
    expect(document.activeElement).toBe(rowButton(container, first.id));
  });

  it('DeleteFocusedRow_MovesFocusToNextRow', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;
    const second = store.add(RECT).crop;
    store.add(RECT);
    deleteButton(container, first.id).focus();

    // Act
    deleteButton(container, first.id).click();

    // Assert
    expect(document.activeElement).toBe(rowButton(container, second.id));
  });

  it('DeleteFocusedLastRow_MovesFocusToPreviousRow', () => {
    // Arrange
    const { container, store } = setup();
    store.add(RECT);
    const second = store.add(RECT).crop;
    const third = store.add(RECT).crop;
    deleteButton(container, third.id).focus();

    // Act
    deleteButton(container, third.id).click();

    // Assert
    expect(document.activeElement).toBe(rowButton(container, second.id));
  });

  it('DeleteFocusedOnlyRow_DoesNotThrowAndFocusStaysInList', () => {
    // Arrange
    const { container, store } = setup();
    const { crop } = store.add(RECT);
    deleteButton(container, crop.id).focus();

    // Act
    deleteButton(container, crop.id).click();

    // Assert
    expect(container.contains(document.activeElement)).toBe(true);
    expect(container.textContent).toContain('No crop areas yet');
  });

  it('StoreChangeWhileFocusOutsideList_DoesNotStealFocus', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;
    store.add(RECT);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();

    // Act
    store.select(first.id);

    // Assert
    expect(document.activeElement).toBe(outside);
    expect(container.contains(document.activeElement)).toBe(false);
  });

  it('DeleteButton_HasAccessibleNameNamingTheFile', () => {
    // Arrange
    const { container, store } = setup();

    // Act
    const { crop } = store.add(RECT);

    // Assert
    expect(deleteButton(container, crop.id).getAttribute('aria-label')).toBe(
      'Delete photo_red.png',
    );
  });

  it('StoreRemove_RemovesRow', () => {
    // Arrange
    const { container, store } = setup();
    const { crop } = store.add(RECT);

    // Act
    store.remove(crop.id);

    // Assert
    expect(rowButton(container, crop.id)).toBeNull();
  });

  it('StoreClear_ShowsEmptyState', () => {
    // Arrange
    const { container, store } = setup();
    store.add(RECT);

    // Act
    store.clear();

    // Assert
    expect(container.textContent).toContain('No crop areas yet');
  });

  it('RenderAfterImageChange_RowsUseNewImageName', () => {
    // Arrange
    const { container, store, list, state } = setup();
    const { crop } = store.add(RECT);

    // Act
    state.image = { name: 'cat', extension: 'jpg' };
    list.render();

    // Assert
    expect(rowButton(container, crop.id).textContent).toContain('cat_red.jpg');
  });

  it('NoImage_RowShowsColorNameOnly', () => {
    // Arrange
    const { container, store } = setup({ image: null });

    // Act
    const { crop } = store.add(RECT);

    // Assert
    expect(rowButton(container, crop.id).textContent.trim()).toBe('red');
  });

  it('MarkupInImageName_RendersAsTextNotElements', () => {
    // Arrange
    const { container, store } = setup({
      image: { name: '<img src=x>', extension: 'png' },
    });

    // Act
    store.add(RECT);

    // Assert
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x>_red.png');
  });

  it('Destroy_StopsReactingToStoreChanges', () => {
    // Arrange
    const { container, store, list } = setup();
    store.add(RECT);
    list.destroy();

    // Act
    store.add(RECT);

    // Assert
    expect(container.querySelectorAll('li.list-group-item')).toHaveLength(1);
  });

  it('Destroy_RemovesClickHandling', () => {
    // Arrange
    const { container, store, list } = setup();
    const first = store.add(RECT).crop;
    store.add(RECT);
    list.destroy();

    // Act
    rowButton(container, first.id).click();

    // Assert
    expect(store.snapshot().selectedId).not.toBe(first.id);
  });

  it.each([
    ['container', { container: null }],
    ['document', { document: null }],
    ['store', { store: {} }],
    ['getImage', { getImage: 'nope' }],
  ])('Invalid%s_ThrowsTypeError', (name, override) => {
    // Arrange
    const options = {
      container: document.createElement('div'),
      document,
      store: createCropStore(),
      getImage: () => null,
      ...override,
    };

    // Act / Assert
    expect(() => createCropList(options)).toThrow(TypeError);
    expect(() => createCropList(options)).toThrow(name);
  });

  it('MissingOptions_ThrowsTypeError', () => {
    // Arrange
    const call = () => createCropList();

    // Act / Assert
    expect(call).toThrow(TypeError);
  });
});
