// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCropWarning } from '../../src/crops/crop-warning.js';

// Mirrors the contract of bootstrap.Alert: close() removes the element and then fires
// closed.bs.alert on it.
const fakeAlertComponent = {
  getOrCreateInstance: (element) => ({
    close: () => {
      element.remove();
      element.dispatchEvent(new Event('closed.bs.alert'));
    },
  }),
};

function setup(options = {}) {
  const container = document.createElement('div');
  const warning = createCropWarning({
    container,
    document,
    alertComponent: fakeAlertComponent,
    ...options,
  });
  return { container, warning };
}

describe('createCropWarning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Show_RendersBootstrapDismissibleDangerAlert', () => {
    // Arrange
    const { container, warning } = setup();

    // Act
    warning.show('Limit reached.');

    // Assert
    const alert = container.querySelector('.alert');
    expect(alert.classList.contains('alert-danger')).toBe(true);
    expect(alert.classList.contains('alert-dismissible')).toBe(true);
    expect(alert.classList.contains('fade')).toBe(true);
    expect(alert.classList.contains('show')).toBe(true);
    expect(alert.textContent).toBe('Limit reached.');
  });

  it('Show_CloseButtonUsesBootstrapDismissAttribute', () => {
    // Arrange
    const { container, warning } = setup();

    // Act
    warning.show('Limit reached.');

    // Assert
    const close = container.querySelector('button.btn-close');
    expect(close.getAttribute('data-bs-dismiss')).toBe('alert');
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(close.getAttribute('type')).toBe('button');
  });

  it('ThreeSecondsPass_AlertIsClosedThroughBootstrap', () => {
    // Arrange
    const { container, warning } = setup();
    warning.show('Limit reached.');

    // Act
    vi.advanceTimersByTime(3000);

    // Assert
    expect(container.children).toHaveLength(0);
  });

  it('BeforeThreeSeconds_AlertStaysVisible', () => {
    // Arrange
    const { container, warning } = setup();
    warning.show('Limit reached.');

    // Act
    vi.advanceTimersByTime(2999);

    // Assert
    expect(container.children).toHaveLength(1);
  });

  it('AlertClosedByUser_PendingTimerIsCancelled', () => {
    // Arrange
    const { container, warning } = setup();
    warning.show('Limit reached.');

    // Act
    container
      .querySelector('.alert')
      .dispatchEvent(new Event('closed.bs.alert'));

    // Assert
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ShownAgainBeforeTimeout_TimerRestarts', () => {
    // Arrange
    const { container, warning } = setup();
    warning.show('First.');
    vi.advanceTimersByTime(2000);

    // Act
    warning.show('Second.');
    vi.advanceTimersByTime(2000);

    // Assert
    expect(container.textContent).toBe('Second.');
    vi.advanceTimersByTime(1000);
    expect(container.children).toHaveLength(0);
  });

  it('ClearCalled_RemovesAlertAndCancelsTimer', () => {
    // Arrange
    const { container, warning } = setup();
    warning.show('Limit reached.');

    // Act
    warning.clear();

    // Assert
    expect(container.children).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('CustomDuration_ClosesAfterThatDuration', () => {
    // Arrange
    const { container, warning } = setup({ durationMs: 500 });
    warning.show('Limit reached.');

    // Act
    vi.advanceTimersByTime(500);

    // Assert
    expect(container.children).toHaveLength(0);
  });

  it.each([
    ['MissingContainer', { container: null }],
    ['MissingDocument', { document: null }],
    ['MissingAlertComponent', { alertComponent: null }],
    ['AlertComponentWithoutFactory', { alertComponent: {} }],
  ])('%s_ThrowsTypeError', (_name, overrides) => {
    // Arrange
    const options = {
      container: document.createElement('div'),
      document,
      alertComponent: fakeAlertComponent,
      ...overrides,
    };

    // Act / Assert
    expect(() => createCropWarning(options)).toThrow(TypeError);
  });

  it.each([[0], [-1], [Number.NaN], ['3000']])(
    'InvalidDuration_%s_Throws',
    (durationMs) => {
      // Arrange
      const container = document.createElement('div');

      // Act / Assert
      expect(() =>
        createCropWarning({
          container,
          document,
          alertComponent: fakeAlertComponent,
          durationMs,
        }),
      ).toThrow(/durationMs/);
    },
  );

  it.each([[''], [null], [42]])(
    'Show_InvalidMessage_%s_ThrowsTypeError',
    (message) => {
      // Arrange
      const { warning } = setup();

      // Act / Assert
      expect(() => warning.show(message)).toThrow(TypeError);
    },
  );
});
