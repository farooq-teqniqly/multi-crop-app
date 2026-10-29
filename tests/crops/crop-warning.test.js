// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCropWarning } from '../../src/crops/crop-warning.js';

function setup(options = {}) {
  const container = document.createElement('div');
  const warning = createCropWarning({ container, document, ...options });
  return { container, warning };
}

describe('createCropWarning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Show_RendersDangerAlertWithMessageAndCloseButton', () => {
    // Arrange
    const { container, warning } = setup();

    // Act
    warning.show('Limit reached.');

    // Assert
    const alert = container.querySelector('.alert.alert-danger');
    expect(alert.textContent).toContain('Limit reached.');
    expect(
      alert.querySelector('button.btn-close').getAttribute('aria-label'),
    ).toBe('Close');
  });

  it('ThreeSecondsPass_AlertIsDismissed', () => {
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

  it('CloseButtonClicked_AlertIsDismissedImmediately', () => {
    // Arrange
    const { container, warning } = setup();
    warning.show('Limit reached.');

    // Act
    container.querySelector('button.btn-close').click();

    // Assert
    expect(container.children).toHaveLength(0);
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
    expect(container.textContent).toContain('Second.');
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

  it('CustomDuration_DismissesAfterThatDuration', () => {
    // Arrange
    const { container, warning } = setup({ durationMs: 500 });
    warning.show('Limit reached.');

    // Act
    vi.advanceTimersByTime(500);

    // Assert
    expect(container.children).toHaveLength(0);
  });

  it.each([
    ['MissingContainer', { container: null, document }],
    [
      'MissingDocument',
      { container: document.createElement('div'), document: null },
    ],
  ])('%s_ThrowsTypeError', (_name, options) => {
    // Arrange / Act / Assert
    expect(() => createCropWarning(options)).toThrow(TypeError);
  });

  it.each([[0], [-1], [Number.NaN], ['3000']])(
    'InvalidDuration_%s_Throws',
    (durationMs) => {
      // Arrange
      const container = document.createElement('div');

      // Act / Assert
      expect(() =>
        createCropWarning({ container, document, durationMs }),
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
