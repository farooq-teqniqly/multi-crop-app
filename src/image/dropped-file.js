/**
 * Picks the file to open from a drop event's data transfer.
 * @param {{ files: ArrayLike<File> }} dataTransfer The drop event's `dataTransfer`.
 * @returns {File|null} The first dropped file, or null when the drop carried none.
 * @throws {TypeError} When dataTransfer is missing or has no list-like `files`.
 */
export function pickDroppedFile(dataTransfer) {
  if (dataTransfer === null || typeof dataTransfer !== 'object') {
    throw new TypeError('dataTransfer must be an object.');
  }
  const { files } = dataTransfer;
  if (
    files === null ||
    typeof files !== 'object' ||
    typeof files.length !== 'number'
  ) {
    throw new TypeError('dataTransfer.files must be a list of files.');
  }
  return files[0] ?? null;
}
