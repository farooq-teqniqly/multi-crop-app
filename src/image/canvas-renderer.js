import { computeDisplaySize } from './fit-scale.js';

/**
 * Draws an image onto a canvas, scaled down to fit the given panel. The bitmap itself is never
 * modified, so full-resolution data stays available to the caller.
 * @param {HTMLCanvasElement} canvas Target canvas; resized to the display size.
 * @param {ImageBitmap} bitmap Full-resolution image.
 * @param {{ width: number, height: number }} panel Available display area in pixels.
 * @param {{ pixelRatio?: number }} [options] Device pixel ratio; the canvas backing store is
 *   scaled by it so the preview stays sharp on high-density displays. Defaults to 1.
 * @returns {{ width: number, height: number }} The display size, in CSS pixels, the image was
 *   drawn at.
 * @throws {TypeError} When canvas or bitmap is missing, the canvas has no 2D context, or
 *   pixelRatio is not a number.
 * @throws {RangeError} When a panel or bitmap dimension, or pixelRatio, is not positive.
 */
export function renderImage(canvas, bitmap, panel, { pixelRatio = 1 } = {}) {
  if (typeof canvas?.getContext !== 'function') {
    throw new TypeError('canvas must be a canvas element.');
  }
  if (bitmap === null || typeof bitmap !== 'object') {
    throw new TypeError('bitmap must be an ImageBitmap.');
  }
  if (typeof pixelRatio !== 'number') {
    throw new TypeError('pixelRatio must be a number.');
  }
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new RangeError('pixelRatio must be a positive finite number.');
  }
  const size = computeDisplaySize(bitmap, panel);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new TypeError('canvas must provide a 2D context.');
  }
  const deviceWidth = Math.round(size.width * pixelRatio);
  const deviceHeight = Math.round(size.height * pixelRatio);
  canvas.width = deviceWidth;
  canvas.height = deviceHeight;
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;
  context.drawImage(bitmap, 0, 0, deviceWidth, deviceHeight);
  return size;
}
