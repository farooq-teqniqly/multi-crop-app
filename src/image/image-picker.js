export const IMAGE_PICKER_OPTIONS = Object.freeze({
  multiple: false,
  excludeAcceptAllOption: true,
  types: [
    {
      description: 'Images (jpeg, png, gif)',
      accept: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
      },
    },
  ],
});

/**
 * Asks the user to pick one image file.
 * @param {object} options Injected dependencies.
 * @param {(pickerOptions: object) => Promise<FileSystemFileHandle[]>} options.showOpenFilePicker
 *   The File System Access API picker.
 * @param {{ warn: (message: string, fields?: object) => void }} options.logger Structured logger.
 * @returns {Promise<File|null>} The chosen file, or null when the user cancels the picker or it returns no file.
 * @throws {TypeError} When an argument is missing or of the wrong type.
 */
export async function pickImageFile(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  if (typeof options.showOpenFilePicker !== 'function') {
    throw new TypeError('options.showOpenFilePicker must be a function.');
  }
  if (typeof options.logger?.warn !== 'function') {
    throw new TypeError('options.logger.warn must be a function.');
  }

  try {
    const [handle] = await options.showOpenFilePicker(IMAGE_PICKER_OPTIONS);
    if (handle === undefined) {
      options.logger.warn('image picker returned no file');
      return null;
    }
    return await handle.getFile();
  } catch (error) {
    if (error?.name === 'AbortError') {
      options.logger.warn('image picker canceled by user');
      return null;
    }
    throw error;
  }
}
