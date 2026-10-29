import { describe, expect, it, vi } from 'vitest';
import { createImageSession } from '../../src/image/image-session.js';

const makeImage = () => ({ bitmap: { width: 1, height: 1, close: vi.fn() } });

describe('createImageSession', () => {
  it('FirstCommit_RendersAndBecomesCurrent', () => {
    // Arrange
    const render = vi.fn();
    const session = createImageSession({ render });
    const image = makeImage();

    // Act
    const committed = session.commit(session.begin(), image);

    // Assert
    expect(committed).toBe(true);
    expect(session.current).toBe(image);
    expect(render).toHaveBeenCalledWith(image);
  });

  it('SecondCommit_ClosesPreviousBitmapAfterRendering', () => {
    // Arrange
    const session = createImageSession({ render: vi.fn() });
    const first = makeImage();
    const second = makeImage();
    session.commit(session.begin(), first);

    // Act
    session.commit(session.begin(), second);

    // Assert
    expect(first.bitmap.close).toHaveBeenCalledOnce();
    expect(second.bitmap.close).not.toHaveBeenCalled();
    expect(session.current).toBe(second);
  });

  it('OlderOpenFinishesLast_IsDiscardedAndItsBitmapClosed', () => {
    // Arrange
    const session = createImageSession({ render: vi.fn() });
    const older = makeImage();
    const newer = makeImage();
    const olderTicket = session.begin();
    const newerTicket = session.begin();
    session.commit(newerTicket, newer);

    // Act
    const committed = session.commit(olderTicket, older);

    // Assert
    expect(committed).toBe(false);
    expect(session.current).toBe(newer);
    expect(older.bitmap.close).toHaveBeenCalledOnce();
    expect(newer.bitmap.close).not.toHaveBeenCalled();
  });

  it('SupersededTicket_IsNoLongerCurrent', () => {
    // Arrange
    const session = createImageSession({ render: vi.fn() });
    const olderTicket = session.begin();

    // Act
    const newerTicket = session.begin();

    // Assert
    expect(session.isCurrent(olderTicket)).toBe(false);
    expect(session.isCurrent(newerTicket)).toBe(true);
  });

  it('RenderFails_KeepsPreviousImageOpenAndClosesNewBitmap', () => {
    // Arrange
    const failure = new Error('no context');
    const render = vi
      .fn()
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw failure;
      });
    const session = createImageSession({ render });
    const previous = makeImage();
    const failing = makeImage();
    session.commit(session.begin(), previous);

    // Act / Assert
    expect(() => session.commit(session.begin(), failing)).toThrow(failure);
    expect(session.current).toBe(previous);
    expect(previous.bitmap.close).not.toHaveBeenCalled();
    expect(failing.bitmap.close).toHaveBeenCalledOnce();
  });

  it.each([
    ['OptionsMissing', undefined],
    ['RenderNotFunction', { render: 1 }],
  ])('%s_ThrowsTypeError', (_name, options) => {
    // Act / Assert
    expect(() => createImageSession(options)).toThrow(TypeError);
  });
});
