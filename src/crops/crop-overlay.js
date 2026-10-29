import {
  DELETE_CONTROL_SIZE,
  deleteControlRect,
  handlePositions,
  rectToDisplay,
} from './crop-geometry.js';

const HANDLE_DRAW_SIZE = 8;
const OUTLINE_COLOR = '#ffffff';
const INK_COLOR = '#212529';
const DELETE_COLOR = '#c92a2a';

function strokeRect(context, rect, { color, width, dash }) {
  context.setLineDash(dash);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function drawCrop(context, rect, color, isSelected) {
  const { width, dash } = isSelected
    ? { width: 3, dash: [] }
    : { width: 2, dash: [6, 4] };
  strokeRect(context, rect, {
    color: OUTLINE_COLOR,
    width: width + 2,
    dash: [],
  });
  strokeRect(context, rect, { color, width, dash });
}

function drawHandles(context, rect) {
  const half = HANDLE_DRAW_SIZE / 2;
  context.setLineDash([]);
  context.lineWidth = 1;
  context.fillStyle = OUTLINE_COLOR;
  context.strokeStyle = INK_COLOR;
  for (const center of Object.values(handlePositions(rect))) {
    context.fillRect(
      center.x - half,
      center.y - half,
      HANDLE_DRAW_SIZE,
      HANDLE_DRAW_SIZE,
    );
    context.strokeRect(
      center.x - half,
      center.y - half,
      HANDLE_DRAW_SIZE,
      HANDLE_DRAW_SIZE,
    );
  }
}

function drawDeleteControl(context, rect, displaySize) {
  const control = deleteControlRect(rect, displaySize);
  const inset = DELETE_CONTROL_SIZE * 0.3;
  context.setLineDash([]);
  context.fillStyle = DELETE_COLOR;
  context.fillRect(control.x, control.y, control.width, control.height);
  context.strokeStyle = OUTLINE_COLOR;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(control.x + inset, control.y + inset);
  context.lineTo(
    control.x + control.width - inset,
    control.y + control.height - inset,
  );
  context.moveTo(control.x + control.width - inset, control.y + inset);
  context.lineTo(control.x + inset, control.y + control.height - inset);
  context.stroke();
}

function drawDraft(context, rect) {
  strokeRect(context, rect, { color: OUTLINE_COLOR, width: 4, dash: [] });
  strokeRect(context, rect, { color: INK_COLOR, width: 2, dash: [6, 4] });
}

function assertOverlayArgs(context, snapshot, displaySize, imageSize) {
  if (typeof context?.clearRect !== 'function') {
    throw new TypeError('context must be a 2D canvas context.');
  }
  if (!Array.isArray(snapshot?.crops)) {
    throw new TypeError('snapshot must have a crops array.');
  }
  if (
    typeof displaySize?.width !== 'number' ||
    typeof imageSize?.width !== 'number'
  ) {
    throw new TypeError('displaySize and imageSize must be sizes.');
  }
}

/**
 * Draws every crop rectangle, the selected one's handles and delete control, and the in-progress
 * drag rectangle onto the overlay canvas context, replacing what was there.
 * @param {CanvasRenderingContext2D} context Overlay canvas context.
 * @param {import('./crop-store.js').CropSnapshot} snapshot Crop state in image pixels.
 * @param {object} options Drawing parameters.
 * @param {{ width: number, height: number }} options.displaySize Display size in CSS pixels.
 * @param {{ width: number, height: number }} options.imageSize Full-resolution image size.
 * @param {number} [options.pixelRatio] Device pixel ratio of the canvas backing store.
 * @param {{x: number, y: number, width: number, height: number}|null} [options.draft] The
 *   rectangle being dragged out, in image pixels, or null.
 * @throws {TypeError} When context, snapshot, or a size is missing or of the wrong type.
 */
export function drawOverlay(
  context,
  snapshot,
  { displaySize, imageSize, pixelRatio = 1, draft = null } = {},
) {
  assertOverlayArgs(context, snapshot, displaySize, imageSize);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, displaySize.width, displaySize.height);
  let selectedRect = null;
  for (const crop of snapshot.crops) {
    const rect = rectToDisplay(crop, displaySize, imageSize);
    const isSelected = crop.id === snapshot.selectedId;
    drawCrop(context, rect, crop.color.hex, isSelected);
    if (isSelected) {
      selectedRect = rect;
    }
  }
  if (selectedRect !== null) {
    drawHandles(context, selectedRect);
    drawDeleteControl(context, selectedRect, displaySize);
  }
  if (draft !== null) {
    drawDraft(context, rectToDisplay(draft, displaySize, imageSize));
  }
}
