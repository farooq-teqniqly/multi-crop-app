import { renderImage } from './image/canvas-renderer.js';
import { computeAvailableHeight } from './image/fit-scale.js';
import { loadImage } from './image/image-loader.js';
import { createImageSession } from './image/image-session.js';
import { pickDroppedFile } from './image/dropped-file.js';
import { pickImageFile } from './image/image-picker.js';
import { exportCrops } from './export/crop-exporter.js';
import { pickSaveDirectory } from './export/save-location-picker.js';
import { createCropInteraction } from './crops/crop-interaction.js';
import { drawOverlay } from './crops/crop-overlay.js';
import { createCropStore } from './crops/crop-store.js';
import { createAlertRegion } from './ui/alert-region.js';
import { createCropList } from './ui/crop-list.js';

const logger = {
  warn: (message, fields) => globalThis.console.warn(message, fields),
};

const openButton = document.getElementById('open-image');
const chooseFolderButton = document.getElementById('choose-folder');
const cropButton = document.getElementById('crop-images');
const cropHint = document.getElementById('crop-hint');
const folderName = document.getElementById('folder-name');
const noticeContainer = document.getElementById('notice');
const resultContainer = document.getElementById('export-result');
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

const notice = createAlertRegion({
  container: noticeContainer,
  document,
  alertComponent: globalThis.bootstrap.Alert,
  variant: 'info',
  dismissible: false,
  className: 'mb-3',
});

const exportSuccess = createAlertRegion({
  container: resultContainer,
  document,
  alertComponent: globalThis.bootstrap.Alert,
  variant: 'success',
  className: 'mb-3',
});

const exportFailure = createAlertRegion({
  container: resultContainer,
  document,
  alertComponent: globalThis.bootstrap.Alert,
  className: 'mb-3',
});

const GIF_NOTICE =
  'This is a gif. Exported crops will be saved as png, not gif.';

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

/** Holds the full-resolution image state that crop export reads from. */
const session = createImageSession({ render: draw });

let saveDirectory = null;
let isExporting = false;

function missingForCrop() {
  if (session.current === null) {
    return 'Open an image to enable cropping.';
  }
  if (cropStore.snapshot().crops.length === 0) {
    return 'Draw at least one crop area to enable cropping.';
  }
  if (saveDirectory === null) {
    return 'Choose a folder to enable cropping.';
  }
  return '';
}

function updateCropButton() {
  const missing = missingForCrop();
  cropButton.disabled = isExporting || missing !== '';
  cropButton.title = missing;
  cropHint.textContent = missing;
}

function redraw() {
  if (session.current !== null) {
    draw(session.current);
  }
}

function updateNotice(image) {
  if (image.extension === 'gif') {
    notice.show(GIF_NOTICE);
  } else {
    notice.clear();
  }
  redraw();
}

async function chooseFolder() {
  try {
    const handle = await pickSaveDirectory({
      showDirectoryPicker: globalThis.showDirectoryPicker.bind(globalThis),
      logger,
    });
    if (handle !== null) {
      saveDirectory = handle;
      folderName.textContent = handle.name;
      updateCropButton();
    }
  } catch (error) {
    logger.warn('choose folder failed', { message: error.message });
    showError(`Could not choose the folder: ${error.message}`);
  }
}

function createExportCanvas(width, height) {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  return exportCanvas;
}

async function runExport() {
  // Supersedes any open still in flight so it cannot swap the image or close the exported bitmap.
  session.begin();
  const image = session.current;
  const directory = saveDirectory;
  isExporting = true;
  openButton.disabled = true;
  updateCropButton();
  showError('');
  exportSuccess.clear();
  exportFailure.clear();
  try {
    const { written, failed } = await exportCrops({
      image,
      crops: cropStore.snapshot().crops,
      directory,
      createCanvas: createExportCanvas,
      logger,
    });
    if (failed.length === 0) {
      const noun = written.length === 1 ? 'file' : 'files';
      exportSuccess.show(
        `Saved ${written.length} ${noun} to ${directory.name}. Existing files with the same name were overwritten.`,
      );
    } else {
      const names = failed.map((entry) => entry.name).join(', ');
      exportFailure.show(
        `Saved ${written.length} of ${written.length + failed.length} files to ${directory.name}. Could not save: ${names}.`,
      );
    }
  } catch (error) {
    logger.warn('export failed', { message: error.message });
    exportFailure.show(`Could not export the crops: ${error.message}`);
  } finally {
    isExporting = false;
    openButton.disabled = typeof globalThis.showOpenFilePicker !== 'function';
    updateCropButton();
    redraw();
  }
}

async function openWith(acquireFile) {
  const ticket = session.begin();
  showError('');
  try {
    const file = await acquireFile();
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
      exportSuccess.clear();
      exportFailure.clear();
      updateNotice(image);
      updateCropButton();
      redrawOverlay();
    }
  } catch (error) {
    logger.warn('open image failed', { message: error.message });
    if (session.isCurrent(ticket)) {
      showError(`Could not open the image: ${error.message}`);
    }
  }
}

function openImage() {
  return openWith(() =>
    pickImageFile({
      showOpenFilePicker: globalThis.showOpenFilePicker.bind(globalThis),
      logger,
    }),
  );
}

if (typeof globalThis.showOpenFilePicker !== 'function') {
  openButton.disabled = true;
  showError(
    'This browser does not support the File System Access API. Use a Chromium browser.',
  );
}

if (typeof globalThis.showDirectoryPicker !== 'function') {
  chooseFolderButton.disabled = true;
  showError(
    'This browser does not support the File System Access API. Use a Chromium browser.',
  );
}

function isFileDrag(event) {
  return event.dataTransfer?.types.includes('Files') === true;
}

let dragDepth = 0;

function setDropActive(isActive) {
  dragDepth = isActive ? dragDepth : 0;
  panel.classList.toggle('drop-active', isActive);
}

function handleDrop(event) {
  event.preventDefault();
  setDropActive(false);
  if (isExporting) {
    return;
  }
  const file = pickDroppedFile(event.dataTransfer);
  if (file === null) {
    showError('Could not open the image: the dropped item is not a file.');
    return;
  }
  openWith(() => file);
}

panel.addEventListener('dragenter', (event) => {
  if (isFileDrag(event) && !isExporting) {
    dragDepth += 1;
    panel.classList.add('drop-active');
  }
});
panel.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = isExporting ? 'none' : 'copy';
});
panel.addEventListener('dragleave', (event) => {
  if (isFileDrag(event)) {
    dragDepth = Math.max(0, dragDepth - 1);
    panel.classList.toggle('drop-active', dragDepth > 0);
  }
});
panel.addEventListener('drop', handleDrop);

// A file or link dropped outside the panel would otherwise navigate the tab away and lose the crops.
for (const type of ['dragover', 'drop']) {
  globalThis.addEventListener(type, (event) => {
    // Keep text drags into the filename inputs working; only file drags must always be suppressed.
    const isTextField =
      event.target instanceof Element &&
      event.target.closest('input, textarea') !== null;
    if (isTextField && !isFileDrag(event)) {
      return;
    }
    event.preventDefault();
  });
}

openButton.addEventListener('click', openImage);
chooseFolderButton.addEventListener('click', chooseFolder);
cropButton.addEventListener('click', runExport);
globalThis.addEventListener('resize', redraw);

cropStore.subscribe(() => {
  cropWarning.clear();
  updateCropButton();
  redrawOverlay();
});

const cropList = createCropList({
  container: document.getElementById('crop-list'),
  document,
  store: cropStore,
  getImage: () => session.current,
  onRejected: (message) => cropWarning.show(message),
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
