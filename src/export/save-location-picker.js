/**
 * Asks the user to pick the folder exported crops are written to.
 * @param {object} options Injected dependencies.
 * @param {(pickerOptions: object) => Promise<FileSystemDirectoryHandle>} options.showDirectoryPicker
 *   The File System Access API directory picker.
 * @param {{ warn: (message: string, fields?: object) => void }} options.logger Structured logger.
 * @returns {Promise<FileSystemDirectoryHandle|null>} The chosen folder, or null when the user
 *   cancels the picker.
 * @throws {TypeError} When an argument is missing or of the wrong type.
 */
export async function pickSaveDirectory(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  if (typeof options.showDirectoryPicker !== 'function') {
    throw new TypeError('options.showDirectoryPicker must be a function.');
  }
  if (typeof options.logger?.warn !== 'function') {
    throw new TypeError('options.logger.warn must be a function.');
  }

  try {
    return await options.showDirectoryPicker({ mode: 'readwrite' });
  } catch (error) {
    if (error?.name === 'AbortError') {
      options.logger.warn('save folder picker canceled by user');
      return null;
    }
    throw error;
  }
}
