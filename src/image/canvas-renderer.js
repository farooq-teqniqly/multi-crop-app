import { computeDisplaySize } from './fit-scale.js';

/**
 * Draws an image onto a canvas, scaled down to fit the given panel. The bitmap itself is never
 * modified, so full-resolution data stays available to the caller.
 * @param {HTMLCanvasElement} canvas Target canvas; resized to the display size.
 * @param {ImageBitmap} bitmap Full-resolution image.
 * @param {{ width: number, height: number }} panel Available display area in pixels.
 * @returns {{ width: number, height: number }} The display size the image was drawn at.
 * @throws {TypeError} When canvas or bitmap is missing, or the canvas has no 2D context.
 * @throws {RangeError} When a panel or bitmap dimension is not positive.
 */
export function renderImage(canvas, bitmap, panel) {
  if (typeof canvas?.getContext !== 'function') {
    throw new TypeError('canvas must be a canvas element.');
  }
  if (bitmap === null || typeof bitmap !== 'object') {
    throw new TypeError('bitmap must be an ImageBitmap.');
  }
  const size = computeDisplaySize(bitmap, panel);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new TypeError('canvas must provide a 2D context.');
  }
  canvas.width = size.width;
  canvas.height = size.height;
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return size;
}
