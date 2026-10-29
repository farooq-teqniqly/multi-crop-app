// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAlertRegion } from '../../src/ui/alert-region.js';

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
  const region = createAlertRegion({
    container,
    document,
    alertComponent: fakeAlertComponent,
    ...options,
  });
  return { container, region };
}

describe('createAlertRegion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Show_RendersBootstrapDismissibleDangerAlert', () => {
    // Arrange
    const { container, region } = setup();

    // Act
    region.show('Something failed.');

    // Assert
    const alert = container.querySelector('.alert');
    expect(alert.classList.contains('alert-danger')).toBe(true);
    expect(alert.classList.contains('alert-dismissible')).toBe(true);
    expect(alert.classList.contains('fade')).toBe(true);
    expect(alert.classList.contains('show')).toBe(true);
    expect(alert.textContent).toBe('Something failed.');
  });

  it('Show_CloseButtonUsesBootstrapDismissAttribute', () => {
    // Arrange
    const { container, region } = setup();

    // Act
    region.show('Something failed.');

    // Assert
    const close = container.querySelector('button.btn-close');
    expect(close.getAttribute('data-bs-dismiss')).toBe('alert');
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(close.getAttribute('type')).toBe('button');
  });

  it('ClassNameGiven_AddsClassesToAlert', () => {
    // Arrange
    const { container, region } = setup({ className: 'mb-3 shadow-sm' });

    // Act
    region.show('Something failed.');

    // Assert
    const alert = container.querySelector('.alert');
    expect(alert.classList.contains('mb-3')).toBe(true);
    expect(alert.classList.contains('shadow-sm')).toBe(true);
  });

  it('NoDuration_AlertStaysUntilClosed', () => {
    // Arrange
    const { container, region } = setup();
    region.show('Something failed.');

    // Act
    vi.advanceTimersByTime(600000);

    // Assert
    expect(container.children).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ThreeSecondsPass_AlertIsClosedThroughBootstrap', () => {
    // Arrange
    const { container, region } = setup({ durationMs: 3000 });
    region.show('Something failed.');

    // Act
    vi.advanceTimersByTime(3000);

    // Assert
    expect(container.children).toHaveLength(0);
  });

  it('BeforeDuration_AlertStaysVisible', () => {
    // Arrange
    const { container, region } = setup({ durationMs: 3000 });
    region.show('Something failed.');

    // Act
    vi.advanceTimersByTime(2999);

    // Assert
    expect(container.children).toHaveLength(1);
  });

  it('AlertClosedByUser_PendingTimerIsCancelled', () => {
    // Arrange
    const { container, region } = setup({ durationMs: 3000 });
    region.show('Something failed.');

    // Act
    container
      .querySelector('.alert')
      .dispatchEvent(new Event('closed.bs.alert'));

    // Assert
    expect(vi.getTimerCount()).toBe(0);
  });

  it('StaleAlertClosedAfterReplacement_KeepsNewAlertTimer', () => {
    // Arrange
    const { container, region } = setup({ durationMs: 3000 });
    region.show('First.');
    const staleAlert = container.querySelector('.alert');
    region.show('Second.');

    // Act
    staleAlert.dispatchEvent(new Event('closed.bs.alert'));
    vi.advanceTimersByTime(3000);

    // Assert
    expect(container.children).toHaveLength(0);
  });

  it('ShownAgainBeforeTimeout_TimerRestarts', () => {
    // Arrange
    const { container, region } = setup({ durationMs: 3000 });
    region.show('First.');
    vi.advanceTimersByTime(2000);

    // Act
    region.show('Second.');
    vi.advanceTimersByTime(2000);

    // Assert
    expect(container.textContent).toBe('Second.');
    vi.advanceTimersByTime(1000);
    expect(container.children).toHaveLength(0);
  });

  it('ShownAgain_ReplacesPreviousAlert', () => {
    // Arrange
    const { container, region } = setup();
    region.show('First.');

    // Act
    region.show('Second.');

    // Assert
    expect(container.children).toHaveLength(1);
    expect(container.textContent).toBe('Second.');
  });

  it('ClearCalled_RemovesAlertAndCancelsTimer', () => {
    // Arrange
    const { container, region } = setup({ durationMs: 3000 });
    region.show('Something failed.');

    // Act
    region.clear();

    // Assert
    expect(container.children).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['MissingContainer', { container: null }],
    ['MissingDocument', { document: null }],
    ['MissingAlertComponent', { alertComponent: null }],
    ['AlertComponentWithoutFactory', { alertComponent: {} }],
    ['NonStringClassName', { className: 42 }],
  ])('%s_ThrowsTypeError', (_name, overrides) => {
    // Arrange
    const options = {
      container: document.createElement('div'),
      document,
      alertComponent: fakeAlertComponent,
      ...overrides,
    };

    // Act / Assert
    expect(() => createAlertRegion(options)).toThrow(TypeError);
  });

  it.each([[0], [-1], [Number.NaN], ['3000']])(
    'InvalidDuration_%s_Throws',
    (durationMs) => {
      // Arrange
      const container = document.createElement('div');

      // Act / Assert
      expect(() =>
        createAlertRegion({
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
      const { region } = setup();

      // Act / Assert
      expect(() => region.show(message)).toThrow(TypeError);
    },
  );
});
