import { buildCropFilename } from '../crops/crop-filename.js';

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
 * @returns {{ render: () => void, destroy: () => void }} Controls: render redraws the list
 *   (for example after the image changes); destroy stops listening.
 * @throws {TypeError} When container, document, store, or getImage is missing or of the wrong
 *   type.
 */
export function createCropList({ container, document, store, getImage } = {}) {
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

  function labelFor(crop, image) {
    const hasExtension =
      typeof image?.extension === 'string' && image.extension !== '';
    return hasExtension
      ? buildCropFilename(image.name, image.extension, crop.color.name)
      : crop.color.name;
  }

  function buildSelectButton(crop, label, isSelected) {
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'btn btn-link crop-row-select flex-grow-1 text-truncate';
    select.classList.toggle('active', isSelected);
    select.dataset.testid = `${ROW_PREFIX}${crop.id}`;
    select.dataset.cropId = crop.id;
    if (isSelected) {
      select.setAttribute('aria-current', 'true');
    }
    const swatch = document.createElement('span');
    swatch.className = 'crop-swatch me-2';
    swatch.style.setProperty('--crop-swatch-color', crop.color.hex);
    swatch.setAttribute('aria-hidden', 'true');
    select.append(swatch, document.createTextNode(label));
    return select;
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
    item.append(
      buildSelectButton(crop, label, isSelected),
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

  function onClick(event) {
    const button = event.target.closest?.('button[data-crop-id]');
    if (!button || !container.contains(button)) {
      return;
    }
    if (button.dataset.action === 'delete') {
      store.remove(button.dataset.cropId);
    } else {
      store.select(button.dataset.cropId);
    }
  }

  container.addEventListener('click', onClick);
  const unsubscribe = store.subscribe(render);
  render();

  return {
    render,
    destroy() {
      container.removeEventListener('click', onClick);
      unsubscribe();
    },
  };
}
