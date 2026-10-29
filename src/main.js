import { renderImage } from './image/canvas-renderer.js';
import { computeAvailableHeight } from './image/fit-scale.js';
import { loadImage } from './image/image-loader.js';
import { pickImageFile } from './image/image-picker.js';

const logger = {
  warn: (message, fields) => globalThis.console.warn(message, fields),
};

const openButton = document.getElementById('open-image');
const errorBox = document.getElementById('error');
const panel = document.getElementById('canvas-panel');
const canvas = document.getElementById('image-canvas');

/** Full-resolution image state kept for later slices (crop export). */
let currentImage = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.toggle('d-none', message === '');
}

function panelSize() {
  const style = globalThis.getComputedStyle(panel);
  return {
    width: Math.max(1, panel.clientWidth - parseFloat(style.paddingLeft) * 2),
    height: computeAvailableHeight(
      globalThis.innerHeight,
      panel.getBoundingClientRect().top,
    ),
  };
}

function redraw() {
  if (currentImage !== null) {
    renderImage(canvas, currentImage.bitmap, panelSize(), {
      pixelRatio: globalThis.devicePixelRatio,
    });
  }
}

async function openImage() {
  showError('');
  try {
    const file = await pickImageFile({
      showOpenFilePicker: globalThis.showOpenFilePicker.bind(globalThis),
      logger,
    });
    if (file === null) {
      return;
    }
    const image = await loadImage(file, {
      createImageBitmap: globalThis.createImageBitmap.bind(globalThis),
    });
    currentImage?.bitmap.close();
    currentImage = image;
    redraw();
  } catch (error) {
    logger.warn('open image failed', { message: error.message });
    showError(`Could not open the image: ${error.message}`);
  }
}

if (typeof globalThis.showOpenFilePicker !== 'function') {
  openButton.disabled = true;
  showError(
    'This browser does not support the File System Access API. Use a Chromium browser.',
  );
}

openButton.addEventListener('click', openImage);
globalThis.addEventListener('resize', redraw);
