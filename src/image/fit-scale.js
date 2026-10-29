/**
 * @typedef {object} Size
 * @property {number} width Width in pixels; a positive finite number.
 * @property {number} height Height in pixels; a positive finite number.
 */

function assertSize(value, name) {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${name} must be an object with width and height.`);
  }
  for (const key of ['width', 'height']) {
    if (typeof value[key] !== 'number') {
      throw new TypeError(`${name}.${key} must be a number.`);
    }
    if (!Number.isFinite(value[key]) || value[key] <= 0) {
      throw new RangeError(`${name}.${key} must be a positive finite number.`);
    }
  }
}

/**
 * Computes the uniform scale that makes an image fit inside a panel. Images that already fit
 * are never enlarged.
 * @param {Size} image Full-resolution image size.
 * @param {Size} panel Available display area.
 * @returns {number} A scale in the range (0, 1].
 * @throws {TypeError} When image or panel is not a size object with numeric dimensions.
 * @throws {RangeError} When any dimension is not a positive finite number.
 */
export function computeFitScale(image, panel) {
  assertSize(image, 'image');
  assertSize(panel, 'panel');
  return Math.min(1, panel.width / image.width, panel.height / image.height);
}

/**
 * Computes the pixel size at which an image is displayed inside a panel.
 * @param {Size} image Full-resolution image size.
 * @param {Size} panel Available display area.
 * @returns {Size} The rounded display size, at least one pixel in each dimension.
 * @throws {TypeError} When image or panel is not a size object with numeric dimensions.
 * @throws {RangeError} When any dimension is not a positive finite number.
 */
export function computeDisplaySize(image, panel) {
  const scale = computeFitScale(image, panel);
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
  };
}

const MIN_PANEL_HEIGHT = 240;

/**
 * Computes the height available for the image below the panel's top edge, never less than a
 * usable floor so a panel pushed below the fold (stacked sidebar, scrolled page) does not
 * collapse the image to a sliver.
 * @param {number} viewportHeight Height of the viewport in pixels.
 * @param {number} panelTop Distance from the viewport top to the panel's top edge in pixels.
 * @param {number} [margin] Bottom margin to leave free in pixels.
 * @returns {number} The available height, at least 240 pixels.
 * @throws {TypeError} When an argument is not a number.
 * @throws {RangeError} When an argument is not finite.
 */
export function computeAvailableHeight(viewportHeight, panelTop, margin = 24) {
  for (const [name, value] of Object.entries({
    viewportHeight,
    panelTop,
    margin,
  })) {
    if (typeof value !== 'number') {
      throw new TypeError(`${name} must be a number.`);
    }
    if (!Number.isFinite(value)) {
      throw new RangeError(`${name} must be a finite number.`);
    }
  }
  return Math.max(MIN_PANEL_HEIGHT, viewportHeight - panelTop - margin);
}
