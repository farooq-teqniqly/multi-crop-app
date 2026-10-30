import { PALETTE, pickColor } from './crop-palette.js';

/** Maximum number of crop areas allowed at once. */
export const MAX_CROP_AREAS = 20;

/**
 * @typedef {object} CropArea
 * @property {string} id Stable identifier.
 * @property {number} x Left edge in full-resolution image pixels.
 * @property {number} y Top edge in full-resolution image pixels.
 * @property {number} width Width in full-resolution image pixels.
 * @property {number} height Height in full-resolution image pixels.
 * @property {import('./crop-palette.js').CropColor} color The area's color.
 * @property {string|null} name Custom base name for the exported file, or null for the default.
 */

/**
 * @typedef {object} CropSnapshot
 * @property {ReadonlyArray<Readonly<CropArea>>} crops Areas, oldest first.
 * @property {string|null} selectedId Id of the selected area, or null.
 */

/**
 * @typedef {object} CropStore
 * @property {number} maxAreas The cap on simultaneous areas.
 * @property {ReadonlyArray<import('./crop-palette.js').CropColor>} palette The colors areas are
 *   drawn from.
 * @property {() => Readonly<CropSnapshot>} snapshot Returns the current frozen state.
 * @property {(rect: {x: number, y: number, width: number, height: number}) =>
 *   {status: 'added', crop: Readonly<CropArea>}|{status: 'limit-reached', limit: number}} add
 *   Adds and selects an area, or reports that the cap is reached.
 * @property {(id: string) => boolean} remove Removes an area; false when the id is unknown.
 * @property {(id: string|null) => void} select Selects an area, or clears the selection.
 * @property {(id: string, rect: {x: number, y: number, width: number, height: number}) => boolean} resize
 *   Replaces an area's bounds; false when the id is unknown.
 * @property {(id: string, name: string|null) => boolean} rename Sets an area's custom base name, or
 *   restores the default with null; false when the id is unknown.
 * @property {() => void} clear Removes every area.
 * @property {(listener: (snapshot: Readonly<CropSnapshot>) => void) => () => void} subscribe
 *   Registers a change listener and returns its unsubscribe function.
 */

function assertBounds(rect) {
  if (rect === null || typeof rect !== 'object') {
    throw new TypeError('rect must be an object.');
  }
  for (const key of ['x', 'y', 'width', 'height']) {
    if (typeof rect[key] !== 'number') {
      throw new TypeError(`rect.${key} must be a number.`);
    }
    if (!Number.isFinite(rect[key])) {
      throw new RangeError(`rect.${key} must be a finite number.`);
    }
  }
  if (rect.width <= 0 || rect.height <= 0) {
    throw new RangeError('rect width and height must be positive.');
  }
}

function assertId(id, name) {
  if (typeof id !== 'string') {
    throw new TypeError(`${name} must be a string.`);
  }
}

function assertOptions(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  const { palette = PALETTE, maxAreas = MAX_CROP_AREAS } = options;
  if (!Array.isArray(palette)) {
    throw new TypeError('options.palette must be an array.');
  }
  if (palette.length === 0) {
    throw new RangeError('options.palette must not be empty.');
  }
  if (typeof maxAreas !== 'number') {
    throw new TypeError('options.maxAreas must be a number.');
  }
  if (!Number.isInteger(maxAreas) || maxAreas < 1) {
    throw new RangeError('options.maxAreas must be a positive integer.');
  }
  return { palette, maxAreas };
}

function pickBounds({ x, y, width, height }) {
  return { x, y, width, height };
}

/**
 * Creates the crop-area state: add, remove, select, and resize with a cap, plus change
 * notification. All rectangles are in full-resolution image pixels.
 * @param {{ palette?: ReadonlyArray<import('./crop-palette.js').CropColor>, maxAreas?: number }}
 *   [options] Overrides for the color palette and the area cap.
 * @returns {CropStore} A new, empty store.
 * @throws {TypeError} When options, palette, or maxAreas has the wrong type.
 * @throws {RangeError} When palette is empty or maxAreas is not a positive integer.
 */
export function createCropStore(options = {}) {
  const { palette, maxAreas } = assertOptions(options);
  const listeners = new Set();
  let crops = [];
  let selectedId = null;
  let nextId = 1;
  let current = Object.freeze({ crops: Object.freeze([]), selectedId: null });

  function commit(nextCrops, nextSelectedId) {
    crops = nextCrops;
    selectedId = nextSelectedId;
    current = Object.freeze({
      crops: Object.freeze([...crops]),
      selectedId,
    });
    for (const listener of [...listeners]) {
      listener(current);
    }
  }

  return {
    get maxAreas() {
      return maxAreas;
    },
    get palette() {
      return palette;
    },
    snapshot: () => current,
    add(rect) {
      assertBounds(rect);
      if (crops.length >= maxAreas) {
        return { status: 'limit-reached', limit: maxAreas };
      }
      const crop = Object.freeze({
        id: `crop-${nextId++}`,
        ...pickBounds(rect),
        name: null,
        color: pickColor(
          palette,
          crops.map((existing) => existing.color.name),
        ),
      });
      commit([...crops, crop], crop.id);
      return { status: 'added', crop };
    },
    remove(id) {
      assertId(id, 'id');
      if (!crops.some((crop) => crop.id === id)) {
        return false;
      }
      commit(
        crops.filter((crop) => crop.id !== id),
        selectedId === id ? null : selectedId,
      );
      return true;
    },
    select(id) {
      if (id !== null) {
        assertId(id, 'id');
      }
      const isUnknown = id !== null && !crops.some((crop) => crop.id === id);
      if (isUnknown || id === selectedId) {
        return;
      }
      commit(crops, id);
    },
    resize(id, rect) {
      assertId(id, 'id');
      assertBounds(rect);
      if (!crops.some((crop) => crop.id === id)) {
        return false;
      }
      commit(
        crops.map((crop) =>
          crop.id === id
            ? Object.freeze({ ...crop, ...pickBounds(rect) })
            : crop,
        ),
        selectedId,
      );
      return true;
    },
    rename(id, name) {
      assertId(id, 'id');
      if (name !== null) {
        if (typeof name !== 'string') {
          throw new TypeError('name must be a string or null.');
        }
        if (name === '') {
          throw new RangeError('name must not be empty.');
        }
      }
      if (!crops.some((crop) => crop.id === id)) {
        return false;
      }
      commit(
        crops.map((crop) =>
          crop.id === id ? Object.freeze({ ...crop, name }) : crop,
        ),
        selectedId,
      );
      return true;
    },
    clear() {
      if (crops.length === 0 && selectedId === null) {
        return;
      }
      commit([], null);
    },
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('listener must be a function.');
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
