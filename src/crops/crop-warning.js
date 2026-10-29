const DEFAULT_DURATION_MS = 3000;

/**
 * Creates a dismissible danger alert rendered into a container. The alert is a Bootstrap
 * alert component: its close button dismisses it through `data-bs-dismiss`, and it closes
 * itself through the component after a delay.
 * @param {object} options Collaborators and tuning.
 * @param {HTMLElement} options.container Live-region element the alert is rendered into.
 * @param {Document} options.document Document used to create elements.
 * @param {{ getOrCreateInstance: (element: Element) => { close: () => void } }} options.alertComponent
 *   Bootstrap's `Alert` class.
 * @param {number} [options.durationMs] Milliseconds before the alert closes itself.
 * @returns {{ show: (message: string) => void, clear: () => void }} Controls for the alert.
 * @throws {TypeError} When container, document, or alertComponent is missing.
 * @throws {RangeError} When durationMs is not a positive number.
 */
export function createCropWarning({
  container,
  document,
  alertComponent,
  durationMs = DEFAULT_DURATION_MS,
} = {}) {
  if (typeof container?.replaceChildren !== 'function') {
    throw new TypeError('container must be an element.');
  }
  if (typeof document?.createElement !== 'function') {
    throw new TypeError('document must be a document.');
  }
  if (typeof alertComponent?.getOrCreateInstance !== 'function') {
    throw new TypeError('alertComponent must be Bootstrap Alert.');
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new RangeError('durationMs must be a positive number.');
  }

  let timer = null;

  function cancelTimer() {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
      timer = null;
    }
  }

  function clear() {
    cancelTimer();
    container.replaceChildren();
  }

  function buildAlert(message) {
    const alert = document.createElement('div');
    alert.className =
      'alert alert-danger alert-dismissible fade show mb-0 shadow-sm pe-auto';
    alert.append(document.createTextNode(message));
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-close';
    close.dataset.bsDismiss = 'alert';
    close.setAttribute('aria-label', 'Close');
    alert.append(close);
    alert.addEventListener('closed.bs.alert', cancelTimer);
    return alert;
  }

  /**
   * Shows the alert, restarting the dismiss timer if one is already showing.
   * @param {string} message Text to display.
   * @throws {TypeError} When message is not a non-empty string.
   */
  function show(message) {
    if (typeof message !== 'string' || message === '') {
      throw new TypeError('message must be a non-empty string.');
    }
    clear();
    const alert = buildAlert(message);
    container.replaceChildren(alert);
    timer = globalThis.setTimeout(() => {
      alertComponent.getOrCreateInstance(alert).close();
    }, durationMs);
  }

  return { show, clear };
}
