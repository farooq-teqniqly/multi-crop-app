// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  const rejections = [];
  const list = createCropList({
    container,
    document,
    store,
    getImage: () => state.image,
    onRejected: (message) => rejections.push(message),
  });
  return { container, store, list, state, rejections };
}

function rowButton(container, id) {
  return container.querySelector(`[data-testid="crop-row-${id}"]`);
}

function rowItem(container, id) {
  return rowButton(container, id).closest('li');
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
    const input = rowButton(container, crop.id);
    expect(input.value).toBe('photo_red.png');
    const swatch = rowItem(container, crop.id).querySelector('.crop-swatch');
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
    const labels = rows.map((input) => input.value);
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
    const selected = rowItem(container, second.id);
    const other = rowItem(container, first.id);
    expect(selected.classList).toContain('active');
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
    expect(rowItem(container, first.id).classList).toContain('active');
  });

  it('StoreSelect_HighlightsMatchingRow', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;
    store.add(RECT);

    // Act
    store.select(first.id);

    // Assert
    expect(rowItem(container, first.id).classList).toContain('active');
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
    expect(rowButton(container, crop.id).value).toBe('cat_red.jpg');
  });

  it('GifImage_RowShowsPngFilename', () => {
    // Arrange
    const { container, store } = setup({
      image: { name: 'anim', extension: 'gif' },
    });

    // Act
    const { crop } = store.add(RECT);

    // Assert
    expect(rowButton(container, crop.id).value).toBe('anim_red.png');
  });

  it('NoImage_RowShowsColorNameOnly', () => {
    // Arrange
    const { container, store } = setup({ image: null });

    // Act
    const { crop } = store.add(RECT);

    // Assert
    expect(rowButton(container, crop.id).value).toBe('red');
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
    expect(container.querySelector('input').value).toBe('<img src=x>_red.png');
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

  it('Row_ExposesFullFilenameAsTooltip', () => {
    // Arrange
    const { container, store } = setup();

    // Act
    const { crop } = store.add(RECT);

    // Assert
    expect(rowButton(container, crop.id).title).toBe('photo_red.png');
  });

  it('NoImage_RowIsReadOnly', () => {
    // Arrange
    const { container, store } = setup({ image: null });

    // Act
    const { crop } = store.add(RECT);

    // Assert
    expect(rowButton(container, crop.id).readOnly).toBe(true);
  });

  it('FilenameFocused_SelectsBaseNameButNotExtension', () => {
    // Arrange
    const { container, store } = setup();
    const { crop } = store.add(RECT);

    // Act
    rowButton(container, crop.id).focus();

    // Assert
    const input = rowButton(container, crop.id);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('photo_red'.length);
  });

  it('FilenameClickedInUnselectedRow_SelectsRowAndBaseName', () => {
    // Arrange
    const { container, store } = setup();
    const first = store.add(RECT).crop;
    store.add(RECT);

    // Act
    rowButton(container, first.id).click();

    // Assert
    const input = rowButton(container, first.id);
    expect(store.snapshot().selectedId).toBe(first.id);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('photo_red'.length);
  });

  it('NameWithDots_SelectionStopsAtLastDot', () => {
    // Arrange
    const { container, store } = setup({
      image: { name: 'a.b', extension: 'png' },
    });
    const { crop } = store.add(RECT);

    // Act
    rowButton(container, crop.id).focus();

    // Assert
    expect(rowButton(container, crop.id).selectionEnd).toBe('a.b_red'.length);
  });

  it('EnterAfterTyping_RenamesAreaKeepingExtension', () => {
    // Arrange
    const { container, store } = setup();
    const { crop } = store.add(RECT);
    const input = rowButton(container, crop.id);
    input.focus();
    input.value = 'hero.png';

    // Act
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    // Assert
    expect(store.snapshot().crops[0].name).toBe('hero');
    expect(rowButton(container, crop.id).value).toBe('hero.png');
    expect(rowButton(container, crop.id).title).toBe('hero.png');
  });

  it('BlurAfterTyping_RenamesArea', () => {
    // Arrange
    const { container, store } = setup();
    const { crop } = store.add(RECT);
    const input = rowButton(container, crop.id);
    input.focus();
    input.value = 'hero';

    // Act
    input.blur();

    // Assert
    expect(store.snapshot().crops[0].name).toBe('hero');
    expect(rowButton(container, crop.id).value).toBe('hero.png');
  });

  it('EscapeAfterTyping_RestoresFilenameWithoutRenaming', () => {
    // Arrange
    const { container, store, rejections } = setup();
    const { crop } = store.add(RECT);
    const input = rowButton(container, crop.id);
    input.focus();
    input.value = 'hero';

    // Act
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    // Assert
    expect(store.snapshot().crops[0].name).toBeNull();
    expect(rowButton(container, crop.id).value).toBe('photo_red.png');
    expect(rejections).toEqual([]);
  });

  it('UnchangedName_DoesNotNotifyStore', () => {
    // Arrange
    const { container, store } = setup();
    const { crop } = store.add(RECT);
    const input = rowButton(container, crop.id);
    input.focus();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    input.blur();

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it.each(['', '   ', 'CON'])(
    'Name_%j_IsRejectedAndFilenameRestored',
    (typed) => {
      // Arrange
      const { container, store, rejections } = setup();
      const { crop } = store.add(RECT);
      const input = rowButton(container, crop.id);
      input.focus();
      input.value = typed;

      // Act
      input.blur();

      // Assert
      expect(store.snapshot().crops[0].name).toBeNull();
      expect(input.value).toBe('photo_red.png');
      expect(rejections).toHaveLength(1);
      expect(rejections[0]).toContain('empty');
    },
  );

  it('NameUsedByAnotherArea_IsRejectedIgnoringCase', () => {
    // Arrange
    const { container, store, rejections } = setup();
    const first = store.add(RECT).crop;
    store.add(RECT);
    rowButton(container, first.id).focus();
    const input = rowButton(container, first.id);
    input.value = 'PHOTO_GREEN';

    // Act
    input.blur();

    // Assert
    expect(store.snapshot().crops[0].name).toBeNull();
    expect(input.value).toBe('photo_red.png');
    expect(rejections).toHaveLength(1);
    expect(rejections[0]).toContain('already used');
  });

  it('RenamedAreaThenImageChange_KeepsCustomName', () => {
    // Arrange
    const { container, store, list, state } = setup();
    const { crop } = store.add(RECT);
    store.rename(crop.id, 'hero');

    // Act
    state.image = { name: 'cat', extension: 'jpg' };
    list.render();

    // Assert
    expect(rowButton(container, crop.id).value).toBe('hero.jpg');
  });

  it('InvalidOnRejected_ThrowsTypeError', () => {
    // Arrange
    const call = () =>
      createCropList({
        container: document.createElement('div'),
        document,
        store: createCropStore(),
        getImage: () => null,
        onRejected: 'nope',
      });

    // Act / Assert
    expect(call).toThrow(TypeError);
    expect(call).toThrow('onRejected');
  });
});
