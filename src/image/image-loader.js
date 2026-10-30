const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif']);
const EXTENSION_BY_TYPE = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
]);
const UNINFORMATIVE_TYPES = new Set(['', 'application/octet-stream']);

/**
 * @typedef {object} LoadedImage
 * @property {File} file The original file, kept for later slices.
 * @property {ImageBitmap} bitmap The full-resolution decoded image; never display-scaled.
 * @property {string} name File name without its extension.
 * @property {string} extension Lowercase extension without the dot: the file's own when it is
 *   jpg, jpeg, png, or gif, otherwise the one implied by its MIME type (jpg, png, or gif).
 * @property {number} width Full-resolution width in pixels.
 * @property {number} height Full-resolution height in pixels.
 */

function splitFileName(fileName) {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) {
    return { name: fileName, extension: '' };
  }
  return {
    name: fileName.slice(0, dot),
    extension: fileName.slice(dot + 1).toLowerCase(),
  };
}

// The OS can report an empty or generic MIME type for a valid file picked by extension, so the
// extension is the fallback signal; the decoder remains the final judge of the content.
function isSupportedFile(file, extension) {
  if (SUPPORTED_TYPES.has(file.type)) {
    return true;
  }
  return (
    UNINFORMATIVE_TYPES.has(file.type) && SUPPORTED_EXTENSIONS.has(extension)
  );
}

function resolveExtension(file, extension) {
  if (SUPPORTED_EXTENSIONS.has(extension)) {
    return extension;
  }
  return EXTENSION_BY_TYPE.get(file.type) ?? extension;
}

/**
 * Decodes an image file at full resolution.
 * @param {File} file A jpeg, png, or gif file, identified by MIME type or, when that is empty or
 *   generic, by extension.
 * @param {object} options Injected dependencies.
 * @param {(file: File) => Promise<ImageBitmap>} options.createImageBitmap Decoder.
 * @returns {Promise<LoadedImage>} The frozen loaded image.
 * @throws {TypeError} When an argument is missing or of the wrong type, or the file type is
 *   not jpeg, png, or gif.
 * @throws {Error} When decoding fails; the original error is set as `cause`.
 */
export async function loadImage(file, options) {
  if (!(file instanceof File)) {
    throw new TypeError('file must be a File.');
  }
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  if (typeof options.createImageBitmap !== 'function') {
    throw new TypeError('options.createImageBitmap must be a function.');
  }
  const parts = splitFileName(file.name);
  if (!isSupportedFile(file, parts.extension)) {
    throw new TypeError(
      `file "${file.name}" (type "${file.type}") is not supported; use jpeg, png, or gif.`,
    );
  }

  let bitmap;
  try {
    bitmap = await options.createImageBitmap(file);
  } catch (error) {
    throw new Error(`Could not decode "${file.name}".`, { cause: error });
  }

  return Object.freeze({
    file,
    bitmap,
    name: parts.name,
    extension: resolveExtension(file, parts.extension),
    width: bitmap.width,
    height: bitmap.height,
  });
}
