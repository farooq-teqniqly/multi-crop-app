import {
  displayToImage,
  hitTest,
  isClick,
  rectFromDrag,
  resizeByHandle,
} from './crop-geometry.js';

/**
 * @typedef {object} Geometry
 * @property {{ width: number, height: number }} displaySize Display size in CSS pixels.
 * @property {{ width: number, height: number }} imageSize Full-resolution image size.
 */

function cursorFor(hit) {
  return hit.type === 'handle' ? hit.handle : hit.type;
}

/**
 * Wires pointer and keyboard input on the overlay canvas to the crop store. Dragging empty image
 * area (or a crop body that is not being resized) draws a new rectangle, a click selects or
 * deselects, handles of the selected crop resize it, and its delete control (or the Delete key)
 * removes it.
 * @param {object} options Injected dependencies.
 * @param {HTMLCanvasElement} options.canvas Overlay canvas that receives the events.
 * @param {import('./crop-store.js').CropStore} options.store Crop state to drive.
 * @param {() => Geometry|null} options.getGeometry Current sizes, or null while no image is open.
 * @param {(draft: {x: number, y: number, width: number, height: number}|null) => void}
 *   options.onDraftChange Called with the rectangle being dragged out, or null when it ends.
 * @param {(limit: number) => void} options.onLimitReached Called when a drag tried to create an
 *   area beyond the cap.
 * @returns {{ dispose: () => void }} Handle that removes the listeners.
 * @throws {TypeError} When an option is missing or of the wrong type.
 */
export function createCropInteraction(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  const { canvas, store, getGeometry, onDraftChange, onLimitReached } = options;
  if (typeof canvas?.addEventListener !== 'function') {
    throw new TypeError('options.canvas must be an element.');
  }
  if (typeof store?.snapshot !== 'function') {
    throw new TypeError('options.store must be a crop store.');
  }
  for (const [name, value] of Object.entries({
    getGeometry,
    onDraftChange,
    onLimitReached,
  })) {
    if (typeof value !== 'function') {
      throw new TypeError(`options.${name} must be a function.`);
    }
  }

  let gesture = null;

  function localPoint(event) {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function hitAt(point, geometry) {
    const { crops, selectedId } = store.snapshot();
    return hitTest(point, { crops, selectedId, ...geometry });
  }

  function startGesture(hit, point) {
    if (hit.type === 'delete') {
      store.remove(hit.id);
      return null;
    }
    if (hit.type === 'handle') {
      return { kind: 'resize', id: hit.id, handle: hit.handle };
    }
    if (hit.type === 'body') {
      store.select(hit.id);
    }
    return { kind: 'draw', start: point, isDragging: false, hit: hit.type };
  }

  function onPointerDown(event) {
    const geometry = getGeometry();
    if (geometry === null || event.button !== 0) {
      return;
    }
    const point = localPoint(event);
    gesture = startGesture(hitAt(point, geometry), point);
    if (gesture !== null) {
      canvas.setPointerCapture?.(event.pointerId);
    }
  }

  function resizeTo(point, geometry) {
    const crop = store.snapshot().crops.find((item) => item.id === gesture.id);
    if (crop === undefined) {
      return;
    }
    const imagePoint = displayToImage(
      point,
      geometry.displaySize,
      geometry.imageSize,
    );
    store.resize(
      crop.id,
      resizeByHandle(crop, gesture.handle, imagePoint, geometry.imageSize),
    );
  }

  function dragTo(point, geometry) {
    if (!gesture.isDragging && isClick(gesture.start, point)) {
      return;
    }
    gesture.isDragging = true;
    const { displaySize, imageSize } = geometry;
    if (store.snapshot().crops.length >= store.maxAreas) {
      onDraftChange(null);
      return;
    }
    onDraftChange(
      rectFromDrag(
        displayToImage(gesture.start, displaySize, imageSize),
        displayToImage(point, displaySize, imageSize),
        imageSize,
      ),
    );
  }

  function onPointerMove(event) {
    const geometry = getGeometry();
    if (geometry === null) {
      return;
    }
    const point = localPoint(event);
    if (gesture === null) {
      canvas.dataset.hit = cursorFor(hitAt(point, geometry));
    } else if (gesture.kind === 'resize') {
      resizeTo(point, geometry);
    } else {
      dragTo(point, geometry);
    }
  }

  function finishDraw(point, geometry) {
    if (!gesture.isDragging) {
      if (gesture.hit === 'none') {
        store.select(null);
      }
      return;
    }
    const { displaySize, imageSize } = geometry;
    const rect = rectFromDrag(
      displayToImage(gesture.start, displaySize, imageSize),
      displayToImage(point, displaySize, imageSize),
      imageSize,
    );
    if (rect !== null) {
      const outcome = store.add(rect);
      if (outcome.status === 'limit-reached') {
        onLimitReached(outcome.limit);
      }
    }
  }

  function onPointerUp(event) {
    const geometry = getGeometry();
    if (gesture?.kind === 'draw' && geometry !== null) {
      finishDraw(localPoint(event), geometry);
      onDraftChange(null);
    }
    gesture = null;
  }

  function onPointerCancel() {
    if (gesture?.kind === 'draw') {
      onDraftChange(null);
    }
    gesture = null;
  }

  function onKeyDown(event) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return;
    }
    const { selectedId } = store.snapshot();
    if (selectedId !== null) {
      event.preventDefault();
      store.remove(selectedId);
    }
  }

  const listeners = {
    pointerdown: onPointerDown,
    pointermove: onPointerMove,
    pointerup: onPointerUp,
    pointercancel: onPointerCancel,
    keydown: onKeyDown,
  };
  for (const [type, listener] of Object.entries(listeners)) {
    canvas.addEventListener(type, listener);
  }

  return {
    dispose() {
      for (const [type, listener] of Object.entries(listeners)) {
        canvas.removeEventListener(type, listener);
      }
    },
  };
}
