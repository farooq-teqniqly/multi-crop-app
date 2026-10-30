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

const MAX_NAME_LENGTH = 200;
// eslint-disable-next-line no-control-regex
const ILLEGAL_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED_DEVICE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function trimEnds(value) {
  return value.trim().replace(/[. ]+$/, '');
}

/**
 * Turns text typed by the user into a safe base name for an exported file. Characters that are
 * illegal in Windows filenames are removed, and a trailing copy of the locked extension is
 * dropped so the extension cannot be duplicated.
 * @param {string} input Text the user typed.
 * @param {string} extension The locked extension without the dot.
 * @returns {string|null} The base name, or null when nothing usable remains or the name is a
 *   reserved device name.
 * @throws {TypeError} When an argument is not a string.
 * @throws {RangeError} When extension is empty.
 */
export function normalizeCropName(input, extension) {
  if (typeof input !== 'string') {
    throw new TypeError('input must be a string.');
  }
  assertNonEmptyString(extension, 'extension');
  const suffix = `.${extension}`.toLowerCase();
  let name = input.replace(ILLEGAL_CHARACTERS, '').trim();
  if (name.toLowerCase().endsWith(suffix)) {
    name = name.slice(0, -suffix.length);
  }
  name = trimEnds(trimEnds(name).slice(0, MAX_NAME_LENGTH));
  if (name === '' || RESERVED_DEVICE_NAME.test(name.split('.')[0])) {
    return null;
  }
  return name;
}

/**
 * Resolves the filename a crop area is exported as: its custom name when it has one, otherwise
 * the default `[imageName]_[color]`, followed by the extension.
 * @param {object} options Inputs.
 * @param {string} options.imageName Source image name without its extension.
 * @param {string} options.extension Export extension without the dot.
 * @param {{name?: string|null, color: {name: string}}} options.crop The crop area.
 * @returns {string} The filename.
 * @throws {TypeError} When options or crop is not an object, or a name is not a string.
 * @throws {RangeError} When imageName or extension is empty.
 */
export function resolveCropFilename(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  const { imageName, extension, crop } = options;
  if (crop === null || typeof crop?.color?.name !== 'string') {
    throw new TypeError('options.crop must be a crop area.');
  }
  if (typeof crop.name === 'string') {
    assertNonEmptyString(extension, 'extension');
    return `${crop.name}.${extension}`;
  }
  return buildCropFilename(imageName, extension, crop.color.name);
}
