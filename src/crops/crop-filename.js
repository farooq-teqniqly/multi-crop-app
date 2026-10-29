function assertNonEmptyString(value, name) {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string.`);
  }
  if (value === '') {
    throw new RangeError(`${name} must not be empty.`);
  }
}

/**
 * Builds the default output filename for a crop area: `[imageName]_[color].[ext]`. No numeric
 * suffix is needed because each existing area has its own palette color.
 * @param {string} imageName Source image name without its extension.
 * @param {string} extension Source image extension without the dot.
 * @param {string} colorName Filename-safe name of the area's color.
 * @returns {string} The default filename.
 * @throws {TypeError} When an argument is not a string.
 * @throws {RangeError} When an argument is empty.
 */
export function buildCropFilename(imageName, extension, colorName) {
  assertNonEmptyString(imageName, 'imageName');
  assertNonEmptyString(extension, 'extension');
  assertNonEmptyString(colorName, 'colorName');
  return `${imageName}_${colorName}.${extension}`;
}
