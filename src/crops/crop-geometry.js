/**
 * @typedef {object} Point
 * @property {number} x Horizontal position.
 * @property {number} y Vertical position.
 */

/**
 * @typedef {object} Rect
 * @property {number} x Left edge.
 * @property {number} y Top edge.
 * @property {number} width Width; zero or more.
 * @property {number} height Height; zero or more.
 */

/**
 * @typedef {object} Size
 * @property {number} width Width; a positive finite number.
 * @property {number} height Height; a positive finite number.
 */

/** Pointer travel, in display pixels, below which a gesture is a click rather than a drag. */
export const MIN_DRAG_DISTANCE = 4;

/** Smallest crop width and height, in image pixels. */
export const MIN_CROP_SIZE = 4;

/** Distance, in display pixels, within which a pointer grabs a resize handle. */
export const HANDLE_HIT_RADIUS = 6;

/** Side length, in display pixels, of the square delete control. */
export const DELETE_CONTROL_SIZE = 18;

const DELETE_CONTROL_GAP = 4;

/** Resize handle names, as compass directions. */
export const HANDLE_NAMES = Object.freeze([
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
]);

function assertNumbers(value, name, keys) {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${name} must be an object.`);
  }
  for (const key of keys) {
    if (typeof value[key] !== 'number') {
      throw new TypeError(`${name}.${key} must be a number.`);
    }
    if (!Number.isFinite(value[key])) {
      throw new RangeError(`${name}.${key} must be a finite number.`);
    }
  }
}

function assertPoint(value, name) {
  assertNumbers(value, name, ['x', 'y']);
}

function assertRect(value, name) {
  assertNumbers(value, name, ['x', 'y', 'width', 'height']);
  if (value.width < 0 || value.height < 0) {
    throw new RangeError(`${name} width and height must not be negative.`);
  }
}

function assertSize(value, name) {
  assertNumbers(value, name, ['width', 'height']);
  if (value.width <= 0 || value.height <= 0) {
    throw new RangeError(`${name} width and height must be positive.`);
  }
}

function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high);
}

function containsPoint(rect, point) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Converts a point from display pixels to full-resolution image pixels.
 * @param {Point} point Point in display pixels.
 * @param {Size} displaySize Size the image is displayed at.
 * @param {Size} imageSize Full-resolution image size.
 * @returns {Point} The point in image pixels.
 * @throws {TypeError} When an argument is not an object with numeric fields.
 * @throws {RangeError} When a value is not finite or a size is not positive.
 */
export function displayToImage(point, displaySize, imageSize) {
  assertPoint(point, 'point');
  assertSize(displaySize, 'displaySize');
  assertSize(imageSize, 'imageSize');
  return {
    x: (point.x * imageSize.width) / displaySize.width,
    y: (point.y * imageSize.height) / displaySize.height,
  };
}

/**
 * Converts a point from full-resolution image pixels to display pixels.
 * @param {Point} point Point in image pixels.
 * @param {Size} displaySize Size the image is displayed at.
 * @param {Size} imageSize Full-resolution image size.
 * @returns {Point} The point in display pixels.
 * @throws {TypeError} When an argument is not an object with numeric fields.
 * @throws {RangeError} When a value is not finite or a size is not positive.
 */
export function imageToDisplay(point, displaySize, imageSize) {
  assertPoint(point, 'point');
  assertSize(displaySize, 'displaySize');
  assertSize(imageSize, 'imageSize');
  return {
    x: (point.x * displaySize.width) / imageSize.width,
    y: (point.y * displaySize.height) / imageSize.height,
  };
}

/**
 * Converts a rectangle from image pixels to display pixels.
 * @param {Rect} rect Rectangle in image pixels.
 * @param {Size} displaySize Size the image is displayed at.
 * @param {Size} imageSize Full-resolution image size.
 * @returns {Rect} The rectangle in display pixels.
 * @throws {TypeError} When an argument is not an object with numeric fields.
 * @throws {RangeError} When a value is not finite, a size is not positive, or the rectangle has
 *   a negative width or height.
 */
export function rectToDisplay(rect, displaySize, imageSize) {
  assertRect(rect, 'rect');
  assertSize(displaySize, 'displaySize');
  assertSize(imageSize, 'imageSize');
  const scaleX = displaySize.width / imageSize.width;
  const scaleY = displaySize.height / imageSize.height;
  return {
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

/**
 * Tells whether a pointer gesture moved too little to count as a drag.
 * @param {Point} start Pointer-down position in display pixels.
 * @param {Point} end Current position in display pixels.
 * @returns {boolean} True when neither axis moved at least MIN_DRAG_DISTANCE.
 * @throws {TypeError} When a point is not an object with numeric x and y.
 * @throws {RangeError} When a coordinate is not finite.
 */
export function isClick(start, end) {
  assertPoint(start, 'start');
  assertPoint(end, 'end');
  return (
    Math.abs(end.x - start.x) < MIN_DRAG_DISTANCE &&
    Math.abs(end.y - start.y) < MIN_DRAG_DISTANCE
  );
}

/**
 * Intersects a rectangle with the image bounds.
 * @param {Rect} rect Rectangle in image pixels.
 * @param {Size} bounds Image size; the bounds run from (0, 0) to (width, height).
 * @returns {Rect} The part of the rectangle inside the bounds; may have zero width or height.
 * @throws {TypeError} When an argument is not an object with numeric fields.
 * @throws {RangeError} When a value is not finite, bounds is not positive, or the rectangle has
 *   a negative width or height.
 */
export function clampToBounds(rect, bounds) {
  assertRect(rect, 'rect');
  assertSize(bounds, 'bounds');
  const left = clamp(rect.x, 0, bounds.width);
  const top = clamp(rect.y, 0, bounds.height);
  const right = clamp(rect.x + rect.width, 0, bounds.width);
  const bottom = clamp(rect.y + rect.height, 0, bounds.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Builds the crop rectangle for a drag, in any of the four directions, clamped to the image.
 * @param {Point} start Drag start in image pixels.
 * @param {Point} end Drag end in image pixels.
 * @param {Size} bounds Image size.
 * @returns {Rect|null} The rectangle, or null when it would be smaller than MIN_CROP_SIZE in
 *   either dimension.
 * @throws {TypeError} When an argument is not an object with numeric fields.
 * @throws {RangeError} When a value is not finite or bounds is not positive.
 */
export function rectFromDrag(start, end, bounds) {
  assertPoint(start, 'start');
  assertPoint(end, 'end');
  assertSize(bounds, 'bounds');
  const rect = clampToBounds(
    {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    },
    bounds,
  );
  if (rect.width < MIN_CROP_SIZE || rect.height < MIN_CROP_SIZE) {
    return null;
  }
  return rect;
}

/**
 * Resizes a rectangle by moving the edges a handle controls to a pointer position. The result
 * stays inside the image, never inverts, and never shrinks below MIN_CROP_SIZE.
 * @param {Rect} rect Rectangle in image pixels.
 * @param {string} handle One of HANDLE_NAMES.
 * @param {Point} point Pointer position in image pixels.
 * @param {Size} bounds Image size.
 * @returns {Rect} The resized rectangle.
 * @throws {TypeError} When an argument is missing or of the wrong type.
 * @throws {RangeError} When handle is unknown, a value is not finite, or bounds is not positive.
 */
export function resizeByHandle(rect, handle, point, bounds) {
  assertRect(rect, 'rect');
  if (typeof handle !== 'string') {
    throw new TypeError('handle must be a string.');
  }
  if (!HANDLE_NAMES.includes(handle)) {
    throw new RangeError(`handle must be one of ${HANDLE_NAMES.join(', ')}.`);
  }
  assertPoint(point, 'point');
  assertSize(bounds, 'bounds');
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;
  if (handle.includes('w')) {
    left = clamp(point.x, 0, right - MIN_CROP_SIZE);
  }
  if (handle.includes('e')) {
    right = clamp(point.x, left + MIN_CROP_SIZE, bounds.width);
  }
  if (handle.includes('n')) {
    top = clamp(point.y, 0, bottom - MIN_CROP_SIZE);
  }
  if (handle.includes('s')) {
    bottom = clamp(point.y, top + MIN_CROP_SIZE, bounds.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Computes where the eight resize handles sit on a rectangle.
 * @param {Rect} rect Rectangle in any coordinate space.
 * @returns {Record<string, Point>} Handle centers keyed by HANDLE_NAMES, in the same space.
 * @throws {TypeError} When rect is not an object with numeric fields.
 * @throws {RangeError} When a value is not finite or the size is negative.
 */
export function handlePositions(rect) {
  assertRect(rect, 'rect');
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return {
    nw: { x: left, y: top },
    n: { x: centerX, y: top },
    ne: { x: right, y: top },
    e: { x: right, y: centerY },
    se: { x: right, y: bottom },
    s: { x: centerX, y: bottom },
    sw: { x: left, y: bottom },
    w: { x: left, y: centerY },
  };
}

/**
 * Computes the delete control's square: centered above a rectangle's top-right corner, nudged
 * inward when that would leave the displayed image.
 * @param {Rect} displayRect Rectangle in display pixels.
 * @param {Size} displaySize Size the image is displayed at.
 * @returns {Rect} The control's square in display pixels.
 * @throws {TypeError} When an argument is not an object with numeric fields.
 * @throws {RangeError} When a value is not finite, a size is not positive, or the rectangle has
 *   a negative width or height.
 */
export function deleteControlRect(displayRect, displaySize) {
  assertRect(displayRect, 'displayRect');
  assertSize(displaySize, 'displaySize');
  const half = DELETE_CONTROL_SIZE / 2;
  const centerX = clamp(
    displayRect.x + displayRect.width,
    half,
    Math.max(half, displaySize.width - half),
  );
  const centerY = Math.max(displayRect.y - half - DELETE_CONTROL_GAP, half);
  return {
    x: centerX - half,
    y: centerY - half,
    width: DELETE_CONTROL_SIZE,
    height: DELETE_CONTROL_SIZE,
  };
}

function findHandle(displayRect, point) {
  let nearest = null;
  let nearestDistance = HANDLE_HIT_RADIUS;
  for (const [name, center] of Object.entries(handlePositions(displayRect))) {
    const distance = Math.hypot(point.x - center.x, point.y - center.y);
    if (distance <= nearestDistance) {
      nearest = name;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function hitSelected(point, selected, displaySize, imageSize) {
  const displayRect = rectToDisplay(selected, displaySize, imageSize);
  const handle = findHandle(displayRect, point);
  if (handle !== null) {
    return { type: 'handle', id: selected.id, handle };
  }
  if (containsPoint(deleteControlRect(displayRect, displaySize), point)) {
    return { type: 'delete', id: selected.id };
  }
  return null;
}

/**
 * Finds what a display-space pointer position is over. Priority: the selected crop's resize
 * handles (so a control clamped onto them never swallows a resize), then its delete control, then crop bodies newest first (later in the array is newer),
 * otherwise nothing.
 * @param {Point} point Pointer position in display pixels.
 * @param {object} options Scene description.
 * @param {ReadonlyArray<Rect & {id: string}>} options.crops Crops in image pixels, oldest first.
 * @param {string|null} options.selectedId Id of the selected crop, or null.
 * @param {Size} options.displaySize Size the image is displayed at.
 * @param {Size} options.imageSize Full-resolution image size.
 * @returns {{type: 'delete', id: string}|{type: 'handle', id: string, handle: string}|{type: 'body', id: string}|{type: 'none'}}
 *   The hit.
 * @throws {TypeError} When an argument is missing or of the wrong type.
 * @throws {RangeError} When a value is not finite or a size is not positive.
 */
export function hitTest(point, options) {
  assertPoint(point, 'point');
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  const { crops, selectedId, displaySize, imageSize } = options;
  if (!Array.isArray(crops)) {
    throw new TypeError('options.crops must be an array.');
  }
  assertSize(displaySize, 'options.displaySize');
  assertSize(imageSize, 'options.imageSize');

  const selected = crops.find((crop) => crop.id === selectedId);
  if (selected !== undefined) {
    const hit = hitSelected(point, selected, displaySize, imageSize);
    if (hit !== null) {
      return hit;
    }
  }
  const body = crops.findLast((crop) =>
    containsPoint(rectToDisplay(crop, displaySize, imageSize), point),
  );
  return body === undefined ? { type: 'none' } : { type: 'body', id: body.id };
}
