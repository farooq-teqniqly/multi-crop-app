import {
  normalizeCropName,
  resolveCropFilename,
} from '../crops/crop-filename.js';
import {
  isExportableExtension,
  resolveExportFormat,
} from '../export/export-format.js';

const DELETE_PREFIX = 'crop-delete-';
const ROW_PREFIX = 'crop-row-';

/**
 * Creates the sidebar list of crop areas. The list is a view over the crop store: it holds no
 * state of its own, re-renders on every store change, and sends row clicks back to the store.
 * @param {object} options Collaborators.
 * @param {HTMLElement} options.container Element the list is rendered into.
 * @param {Document} options.document Document used to create elements.
 * @param {import('../crops/crop-store.js').CropStore} options.store The crop-area state.
 * @param {() => ({name: string, extension: string}|null)} options.getImage Returns the open
 *   image's name and extension, or null when no image is open.
 * @param {(message: string) => void} [options.onRejected] Called with a user-facing message when
 *   an edited filename is rejected.
 * @returns {{ render: () => void, destroy: () => void }} Controls: render redraws the list
 *   (for example after the image changes); destroy stops listening.
 * @throws {TypeError} When container, document, store, or getImage is missing or of the wrong
 *   type, or onRejected is given and is not a function.
 */
export function createCropList({
  container,
  document,
  store,
  getImage,
  onRejected = () => {},
} = {}) {
  if (typeof container?.replaceChildren !== 'function') {
    throw new TypeError('container must be an element.');
  }
  if (typeof document?.createElement !== 'function') {
    throw new TypeError('document must be a document.');
  }
  if (
    typeof store?.snapshot !== 'function' ||
    typeof store?.subscribe !== 'function'
  ) {
    throw new TypeError('store must be a crop store.');
  }
  if (typeof getImage !== 'function') {
    throw new TypeError('getImage must be a function.');
  }
  if (typeof onRejected !== 'function') {
    throw new TypeError('onRejected must be a function.');
  }

  function exportExtension(image) {
    return isExportableExtension(image?.extension)
      ? resolveExportFormat(image.extension).extension
      : null;
  }

  function labelFor(crop, image) {
    const extension = exportExtension(image);
    if (extension === null) {
      return crop.color.name;
    }
    return resolveCropFilename({ imageName: image.name, extension, crop });
  }

  function buildNameInput(crop, label, canEdit) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className =
      'crop-name form-control form-control-sm border-0 bg-transparent flex-grow-1';
    input.value = label;
    input.title = label;
    input.readOnly = !canEdit;
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.dataset.testid = `${ROW_PREFIX}${crop.id}`;
    input.dataset.cropId = crop.id;
    input.dataset.action = 'rename';
    input.setAttribute(
      'aria-label',
      `Filename for ${crop.color.name} crop area`,
    );
    return input;
  }

  function buildSwatch(crop) {
    const swatch = document.createElement('span');
    swatch.className = 'crop-swatch ms-3 me-1 flex-shrink-0';
    swatch.style.setProperty('--crop-swatch-color', crop.color.hex);
    swatch.setAttribute('aria-hidden', 'true');
    return swatch;
  }

  function buildDeleteButton(crop, label) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-sm btn-outline-secondary border-0 me-1';
    remove.dataset.testid = `${DELETE_PREFIX}${crop.id}`;
    remove.dataset.cropId = crop.id;
    remove.dataset.action = 'delete';
    remove.setAttribute('aria-label', `Delete ${label}`);
    const icon = document.createElement('i');
    icon.className = 'bi bi-trash';
    icon.setAttribute('aria-hidden', 'true');
    remove.append(icon);
    return remove;
  }

  function buildRow(crop, image, isSelected) {
    const label = labelFor(crop, image);
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex align-items-center p-0';
    item.classList.toggle('active', isSelected);
    if (isSelected) {
      item.setAttribute('aria-current', 'true');
    }
    item.append(
      buildSwatch(crop),
      buildNameInput(crop, label, exportExtension(image) !== null),
      buildDeleteButton(crop, label),
    );
    return item;
  }

  let renderedIds = [];

  function focusedCropId() {
    const active = document.activeElement;
    return container.contains(active) ? (active.dataset?.cropId ?? null) : null;
  }

  function pickFocusTarget(focusedId, previousIds, ids) {
    const index = previousIds.indexOf(focusedId);
    const following = previousIds.slice(index + 1);
    const preceding = previousIds.slice(0, Math.max(index, 0)).reverse();
    return [focusedId, ...following, ...preceding].find((id) =>
      ids.includes(id),
    );
  }

  function restoreFocus(focusedId, previousIds, ids) {
    const targetId = pickFocusTarget(focusedId, previousIds, ids);
    const target =
      targetId === undefined
        ? container.querySelector('[data-testid="crop-list-empty"]')
        : container.querySelector(`[data-testid="${ROW_PREFIX}${targetId}"]`);
    target?.focus();
  }

  function render() {
    const { crops, selectedId } = store.snapshot();
    const ids = crops.map((crop) => crop.id);
    const focusedId = focusedCropId();
    const previousIds = renderedIds;
    draw(crops, selectedId);
    renderedIds = ids;
    if (focusedId !== null) {
      restoreFocus(focusedId, previousIds, ids);
    }
  }

  function draw(crops, selectedId) {
    if (crops.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-body-secondary small px-3 mb-0';
      empty.dataset.testid = 'crop-list-empty';
      empty.tabIndex = -1;
      empty.textContent = 'No crop areas yet';
      container.replaceChildren(empty);
      return;
    }
    const image = getImage();
    const group = document.createElement('ul');
    group.className = 'list-group list-group-flush';
    group.append(
      ...crops.map((crop) => buildRow(crop, image, crop.id === selectedId)),
    );
    container.replaceChildren(group);
  }

  function nameInputFrom(target) {
    const input = target?.closest?.('input[data-crop-id]') ?? null;
    return input !== null && container.contains(input) ? input : null;
  }

  // Selecting a row redraws the list and replaces the input the user focused, so focus and the
  // selection go to the freshly drawn input.
  function activate(input) {
    const { cropId } = input.dataset;
    store.select(cropId);
    const fresh =
      container.querySelector(`[data-testid="${ROW_PREFIX}${cropId}"]`) ??
      input;
    if (document.activeElement !== fresh) {
      fresh.focus();
    }
    const dot = fresh.value.lastIndexOf('.');
    fresh.setSelectionRange(0, dot === -1 ? fresh.value.length : dot);
  }

  function reject(input, label, message) {
    input.value = label;
    onRejected(message);
  }

  function otherFilenames(cropId, image) {
    return store
      .snapshot()
      .crops.filter((crop) => crop.id !== cropId)
      .map((crop) => labelFor(crop, image).toLowerCase());
  }

  function commitName(input) {
    const image = getImage();
    const extension = exportExtension(image);
    const crop = store
      .snapshot()
      .crops.find((candidate) => candidate.id === input.dataset.cropId);
    if (extension === null || crop === undefined) {
      return;
    }
    const label = labelFor(crop, image);
    const name = normalizeCropName(input.value, extension);
    if (name === null) {
      reject(
        input,
        label,
        'A filename cannot be empty or a reserved system name.',
      );
      return;
    }
    const filename = `${name}.${extension}`;
    if (filename === label) {
      input.value = label;
    } else if (
      otherFilenames(crop.id, image).includes(filename.toLowerCase())
    ) {
      reject(
        input,
        label,
        `The filename ${filename} is already used by another crop area.`,
      );
    } else {
      store.rename(crop.id, name);
    }
  }

  function onClick(event) {
    const input = nameInputFrom(event.target);
    if (input !== null) {
      activate(input);
      return;
    }
    const button = event.target.closest?.('button[data-crop-id]');
    if (
      button &&
      container.contains(button) &&
      button.dataset.action === 'delete'
    ) {
      store.remove(button.dataset.cropId);
    }
  }

  function onFocusIn(event) {
    const input = nameInputFrom(event.target);
    if (input !== null) {
      activate(input);
    }
  }

  function onFocusOut(event) {
    const input = nameInputFrom(event.target);
    if (input !== null && input.isConnected) {
      commitName(input);
    }
  }

  function onKeyDown(event) {
    const input = nameInputFrom(event.target);
    if (input === null) {
      return;
    }
    if (event.key === 'Enter') {
      input.blur();
    } else if (event.key === 'Escape') {
      input.value = input.title;
      input.blur();
    }
  }

  container.addEventListener('click', onClick);
  container.addEventListener('focusin', onFocusIn);
  container.addEventListener('focusout', onFocusOut);
  container.addEventListener('keydown', onKeyDown);
  const unsubscribe = store.subscribe(render);
  render();

  return {
    render,
    destroy() {
      container.removeEventListener('click', onClick);
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
      container.removeEventListener('keydown', onKeyDown);
      unsubscribe();
    },
  };
}
