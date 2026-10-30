const FORMATS = new Map([
  ['jpg', { extension: 'jpg', mimeType: 'image/jpeg' }],
  ['jpeg', { extension: 'jpeg', mimeType: 'image/jpeg' }],
  ['png', { extension: 'png', mimeType: 'image/png' }],
  // Canvas encoders have no gif output, so a gif source falls back to png.
  ['gif', { extension: 'png', mimeType: 'image/png' }],
]);

/**
 * Chooses the file extension and MIME type crops are exported with for a source extension.
 * jpeg and png keep their format; gif falls back to png.
 * @param {string} extension Source image extension without the dot, any case.
 * @returns {{extension: string, mimeType: string}} The export extension and encoder MIME type.
 * @throws {TypeError} When extension is not a string.
 * @throws {RangeError} When extension is not jpg, jpeg, png, or gif.
 */
export function resolveExportFormat(extension) {
  if (typeof extension !== 'string') {
    throw new TypeError('extension must be a string.');
  }
  const format = FORMATS.get(extension.toLowerCase());
  if (format === undefined) {
    throw new RangeError(`extension "${extension}" is not supported.`);
  }
  return { ...format };
}

/**
 * Tells whether crops can be exported for a source extension.
 * @param {string} extension Source image extension without the dot, any case.
 * @returns {boolean} True for jpg, jpeg, png, and gif; false for anything else.
 */
export function isExportableExtension(extension) {
  return typeof extension === 'string' && FORMATS.has(extension.toLowerCase());
}
