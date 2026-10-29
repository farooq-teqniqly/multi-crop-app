const DEFAULT_DURATION_MS = 3000;

/**
 * Creates a dismissible danger alert rendered into a container. The alert closes itself after
 * a delay or when its close button is pressed.
 * @param {object} options Collaborators and tuning.
 * @param {HTMLElement} options.container Live-region element the alert is rendered into.
 * @param {Document} options.document Document used to create elements.
 * @param {number} [options.durationMs] Milliseconds before the alert dismisses itself.
 * @returns {{ show: (message: string) => void, clear: () => void }} Controls for the alert.
 * @throws {TypeError} When container or document is missing.
 * @throws {RangeError} When durationMs is not a positive number.
 */
export function createCropWarning({
  container,
  document,
  durationMs = DEFAULT_DURATION_MS,
} = {}) {
  if (typeof container?.replaceChildren !== 'function') {
    throw new TypeError('container must be an element.');
  }
  if (typeof document?.createElement !== 'function') {
    throw new TypeError('document must be a document.');
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new RangeError('durationMs must be a positive number.');
  }

  let timer = null;

  function clear() {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
      timer = null;
    }
    container.replaceChildren();
  }

  function buildAlert(message) {
    const alert = document.createElement('div');
    alert.className =
      'alert alert-danger alert-dismissible mb-0 shadow-sm pe-auto';
    alert.append(document.createTextNode(message));
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-close';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', clear);
    alert.append(close);
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
    container.replaceChildren(buildAlert(message));
    timer = globalThis.setTimeout(clear, durationMs);
  }

  return { show, clear };
}
