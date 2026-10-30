const VARIANTS = new Set(['danger', 'info', 'success']);

function assertVariant(variant) {
  if (typeof variant !== 'string') {
    throw new TypeError('variant must be a string.');
  }
  if (!VARIANTS.has(variant)) {
    throw new RangeError('variant must be danger, info, or success.');
  }
}

function assertOptions({
  container,
  document,
  alertComponent,
  durationMs,
  className,
  variant,
  dismissible,
}) {
  if (typeof container?.replaceChildren !== 'function') {
    throw new TypeError('container must be an element.');
  }
  if (typeof document?.createElement !== 'function') {
    throw new TypeError('document must be a document.');
  }
  if (typeof alertComponent?.getOrCreateInstance !== 'function') {
    throw new TypeError('alertComponent must be Bootstrap Alert.');
  }
  if (typeof dismissible !== 'boolean') {
    throw new TypeError('dismissible must be a boolean.');
  }
  if (typeof className !== 'string') {
    throw new TypeError('className must be a string.');
  }
  assertVariant(variant);
  if (
    durationMs !== null &&
    (!Number.isFinite(durationMs) || durationMs <= 0)
  ) {
    throw new RangeError('durationMs must be null or a positive number.');
  }
}

/**
 * Creates a region that shows one dismissible danger alert at a time. The alert is a
 * Bootstrap alert component: its close button dismisses it through `data-bs-dismiss`, and an
 * optional timeout closes it through the same component.
 * @param {object} options Collaborators and tuning.
 * @param {HTMLElement} options.container Live-region element the alert is rendered into.
 * @param {Document} options.document Document used to create elements.
 * @param {{ getOrCreateInstance: (element: Element) => { close: () => void } }} options.alertComponent
 *   Bootstrap's `Alert` class.
 * @param {number|null} [options.durationMs] Milliseconds before the alert closes itself, or
 *   null to keep it until the user closes it.
 * @param {string} [options.className] Extra classes for the alert element.
 * @param {'danger'|'info'|'success'} [options.variant] Bootstrap alert color.
 * @param {boolean} [options.dismissible] Whether the alert has a close button; false keeps it
 *   until the region clears it.
 * @returns {{ show: (message: string) => void, clear: () => void }} Controls for the region.
 * @throws {TypeError} When container, document, or alertComponent is missing, or className
 *   or variant is not a string, or dismissible is not a boolean.
 * @throws {RangeError} When durationMs is neither null nor a positive number, or variant is not
 *   danger, info, or success.
 */
export function createAlertRegion({
  container,
  document,
  alertComponent,
  durationMs = null,
  className = '',
  variant = 'danger',
  dismissible = true,
} = {}) {
  assertOptions({
    container,
    document,
    alertComponent,
    durationMs,
    className,
    variant,
    dismissible,
  });

  let timer = null;
  let activeAlert = null;

  function cancelTimer() {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
      timer = null;
    }
  }

  function clear() {
    activeAlert = null;
    cancelTimer();
    container.replaceChildren();
  }

  function buildAlert(message) {
    const alert = document.createElement('div');
    const dismissibleClass = dismissible ? 'alert-dismissible' : '';
    alert.className =
      `alert alert-${variant} ${dismissibleClass} fade show ${className}`
        .replaceAll(/\s+/g, ' ')
        .trim();
    alert.append(document.createTextNode(message));
    if (!dismissible) {
      return alert;
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-close';
    close.dataset.bsDismiss = 'alert';
    close.setAttribute('aria-label', 'Close');
    alert.append(close);
    alert.addEventListener('closed.bs.alert', () => {
      if (alert === activeAlert) {
        cancelTimer();
      }
    });
    return alert;
  }

  /**
   * Shows the alert in place of any current one, restarting the dismiss timer if configured.
   * @param {string} message Text to display.
   * @throws {TypeError} When message is not a non-empty string.
   */
  function show(message) {
    if (typeof message !== 'string' || message === '') {
      throw new TypeError('message must be a non-empty string.');
    }
    clear();
    const alert = buildAlert(message);
    activeAlert = alert;
    container.replaceChildren(alert);
    if (durationMs !== null) {
      timer = globalThis.setTimeout(() => {
        alertComponent.getOrCreateInstance(alert).close();
      }, durationMs);
    }
  }

  return { show, clear };
}
