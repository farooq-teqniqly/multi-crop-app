import { buildCropFilename } from '../crops/crop-filename.js';
import { toPixelRect } from '../crops/crop-region.js';
import { resolveExportFormat } from './export-format.js';

const JPEG_QUALITY = 0.95;

/**
 * @typedef {object} ExportResult
 * @property {string[]} written Names of the files written, in crop order.
 * @property {Array<{name: string, error: Error}>} failed Files that could not be written.
 */

function encode(canvas, mimeType) {
  return new Promise((resolve, reject) => {
    const quality = mimeType === 'image/jpeg' ? JPEG_QUALITY : undefined;
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error('The browser could not encode the image.'));
        } else {
          resolve(blob);
        }
      },
      mimeType,
      quality,
    );
  });
}

async function writeBlob(directory, name, blob) {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw error;
  }
}

async function exportOne({ image, crop, format, createCanvas }) {
  const rect = toPixelRect(crop, image);
  const canvas = createCanvas(rect.width, rect.height);
  canvas
    .getContext('2d')
    .drawImage(
      image.bitmap,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      rect.width,
      rect.height,
    );
  const name = buildCropFilename(image.name, format.extension, crop.color.name);
  return { name, blob: await encode(canvas, format.mimeType) };
}

/**
 * Writes one file per crop area into a folder, cropped from the full-resolution image bitmap.
 * Files with the same name are overwritten. A failure on one file does not stop the others.
 * @param {object} options Injected dependencies and inputs.
 * @param {import('../image/image-loader.js').LoadedImage} options.image The open image.
 * @param {ReadonlyArray<import('../crops/crop-store.js').CropArea>} options.crops Areas to export.
 * @param {FileSystemDirectoryHandle} options.directory Destination folder.
 * @param {(width: number, height: number) => HTMLCanvasElement} options.createCanvas Creates an
 *   off-screen canvas of the given pixel size.
 * @param {{ warn: (message: string, fields?: object) => void }} options.logger Structured logger.
 * @returns {Promise<ExportResult>} The written file names and the failures.
 * @throws {TypeError} When an argument is missing or of the wrong type.
 */
export async function exportCrops(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  const { image, crops, directory, createCanvas, logger } = options;
  if (image === null || typeof image !== 'object') {
    throw new TypeError('options.image must be an object.');
  }
  if (!Array.isArray(crops)) {
    throw new TypeError('options.crops must be an array.');
  }
  if (typeof directory?.getFileHandle !== 'function') {
    throw new TypeError('options.directory must be a directory handle.');
  }
  if (typeof createCanvas !== 'function') {
    throw new TypeError('options.createCanvas must be a function.');
  }
  if (typeof logger?.warn !== 'function') {
    throw new TypeError('options.logger.warn must be a function.');
  }

  const format = resolveExportFormat(image.extension);
  const written = [];
  const failed = [];
  for (const crop of crops) {
    const name = buildCropFilename(
      image.name,
      format.extension,
      crop.color.name,
    );
    try {
      const output = await exportOne({
        image,
        crop,
        format,
        createCanvas,
      });
      await writeBlob(directory, output.name, output.blob);
      written.push(output.name);
    } catch (error) {
      logger.warn('crop export failed', { name, message: error.message });
      failed.push({ name, error });
    }
  }
  return { written, failed };
}
