import { renderImage } from './image/canvas-renderer.js';
import { computeAvailableHeight } from './image/fit-scale.js';
import { loadImage } from './image/image-loader.js';
import { createImageSession } from './image/image-session.js';
import { pickImageFile } from './image/image-picker.js';
import { createCropInteraction } from './crops/crop-interaction.js';
import { drawOverlay } from './crops/crop-overlay.js';
import { createCropStore } from './crops/crop-store.js';
import { createAlertRegion } from './ui/alert-region.js';
import { createCropList } from './ui/crop-list.js';

const logger = {
  warn: (message, fields) => globalThis.console.warn(message, fields),
};

const openButton = document.getElementById('open-image');
const errorContainer = document.getElementById('error');
const panel = document.getElementById('canvas-panel');
const canvas = document.getElementById('image-canvas');
const cropCanvas = document.getElementById('crop-canvas');
const cropStatus = document.getElementById('crop-status');

const errorAlert = createAlertRegion({
  container: errorContainer,
  document,
  alertComponent: globalThis.bootstrap.Alert,
  className: 'mb-3',
});

function showError(message) {
  if (message === '') {
    errorAlert.clear();
  } else {
    errorAlert.show(message);
  }
}

const BOTTOM_MARGIN = 24;

function panelSize() {
  const style = globalThis.getComputedStyle(panel);
  return {
    width: Math.max(
      1,
      panel.clientWidth - Number.parseFloat(style.paddingLeft) * 2,
    ),
    height: computeAvailableHeight(
      globalThis.innerHeight,
      panel.getBoundingClientRect().top,
      BOTTOM_MARGIN + Number.parseFloat(style.paddingTop) * 2,
    ),
  };
}

const cropStore = createCropStore();
let displaySize = null;
let draft = null;

const cropWarning = createAlertRegion({
  container: cropStatus,
  document,
  alertComponent: globalThis.bootstrap.Alert,
  durationMs: 3000,
  className: 'mb-0 shadow-sm pe-auto',
});

function redrawOverlay(image = session.current) {
  if (image === null || displaySize === null) {
    return;
  }
  drawOverlay(cropCanvas.getContext('2d'), cropStore.snapshot(), {
    displaySize,
    imageSize: { width: image.width, height: image.height },
    pixelRatio: globalThis.devicePixelRatio,
    draft,
  });
}

function sizeOverlay() {
  const ratio = globalThis.devicePixelRatio;
  cropCanvas.width = Math.round(displaySize.width * ratio);
  cropCanvas.height = Math.round(displaySize.height * ratio);
  cropCanvas.style.width = `${displaySize.width}px`;
  cropCanvas.style.height = `${displaySize.height}px`;
}

function draw(image) {
  displaySize = renderImage(canvas, image.bitmap, panelSize(), {
    pixelRatio: globalThis.devicePixelRatio,
  });
  sizeOverlay();
  redrawOverlay(image);
}

/** Holds the full-resolution image state kept for later slices (crop export). */
const session = createImageSession({ render: draw });

function redraw() {
  if (session.current !== null) {
    draw(session.current);
  }
}

async function openImage() {
  const ticket = session.begin();
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
    if (session.commit(ticket, image)) {
      cropInteraction.cancel();
      cropStore.clear();
      draft = null;
      cropWarning.clear();
      cropList.render();
      redrawOverlay();
    }
  } catch (error) {
    logger.warn('open image failed', { message: error.message });
    if (session.isCurrent(ticket)) {
      showError(`Could not open the image: ${error.message}`);
    }
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

cropStore.subscribe(() => {
  cropWarning.clear();
  redrawOverlay();
});

const cropList = createCropList({
  container: document.getElementById('crop-list'),
  document,
  store: cropStore,
  getImage: () => session.current,
});

const cropInteraction = createCropInteraction({
  canvas: cropCanvas,
  store: cropStore,
  getGeometry: () =>
    session.current === null || displaySize === null
      ? null
      : {
          displaySize,
          imageSize: {
            width: session.current.width,
            height: session.current.height,
          },
        },
  onDraftChange: (rect) => {
    draft = rect;
    redrawOverlay();
  },
  onLimitReached: (limit) =>
    cropWarning.show(
      `Crop area limit reached: ${limit} is the maximum. Delete one to add another.`,
    ),
});
