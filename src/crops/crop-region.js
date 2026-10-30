function assertFiniteNumbers(value, name, keys) {
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

function clampSpan(start, length, limit) {
  const from = Math.min(Math.max(Math.round(start), 0), limit - 1);
  const to = Math.min(Math.max(Math.round(start + length), from + 1), limit);
  return { start: from, length: to - from };
}

/**
 * Converts a crop area to the integer pixel rectangle to read from the full-resolution image.
 * Edges are rounded to the nearest pixel, the rectangle is clamped to the image bounds, and it
 * is never smaller than 1x1.
 * @param {{x: number, y: number, width: number, height: number}} crop Crop bounds in
 *   full-resolution image pixels.
 * @param {{width: number, height: number}} imageSize Full-resolution image size in pixels.
 * @returns {{x: number, y: number, width: number, height: number}} The integer pixel rectangle.
 * @throws {TypeError} When crop or imageSize is not an object or a field is not a number.
 * @throws {RangeError} When a field is not finite, or an image dimension is below 1.
 */
export function toPixelRect(crop, imageSize) {
  assertFiniteNumbers(crop, 'crop', ['x', 'y', 'width', 'height']);
  assertFiniteNumbers(imageSize, 'imageSize', ['width', 'height']);
  if (imageSize.width < 1 || imageSize.height < 1) {
    throw new RangeError('imageSize width and height must be at least 1.');
  }
  const horizontal = clampSpan(crop.x, crop.width, imageSize.width);
  const vertical = clampSpan(crop.y, crop.height, imageSize.height);
  return {
    x: horizontal.start,
    y: vertical.start,
    width: horizontal.length,
    height: vertical.length,
  };
}
