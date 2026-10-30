import { describe, expect, it, vi } from 'vitest';
import { pickSaveDirectory } from '../../src/export/save-location-picker.js';

describe('pickSaveDirectory', () => {
  it('UserPicksFolder_ReturnsHandleAndRequestsReadWrite', async () => {
    // Arrange
    const handle = { name: 'out' };
    const showDirectoryPicker = vi.fn().mockResolvedValue(handle);
    const logger = { warn: vi.fn() };

    // Act
    const result = await pickSaveDirectory({ showDirectoryPicker, logger });

    // Assert
    expect(result).toBe(handle);
    expect(showDirectoryPicker).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('UserCancels_ReturnsNullAndLogsWarning', async () => {
    // Arrange
    const abort = new DOMException('canceled', 'AbortError');
    const showDirectoryPicker = vi.fn().mockRejectedValue(abort);
    const logger = { warn: vi.fn() };

    // Act
    const result = await pickSaveDirectory({ showDirectoryPicker, logger });

    // Assert
    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('PickerFailsUnexpectedly_Rethrows', async () => {
    // Arrange
    const failure = new Error('boom');
    const showDirectoryPicker = vi.fn().mockRejectedValue(failure);
    const logger = { warn: vi.fn() };

    // Act / Assert
    await expect(
      pickSaveDirectory({ showDirectoryPicker, logger }),
    ).rejects.toBe(failure);
  });

  it.each([
    ['OptionsMissing', undefined],
    ['PickerNotFunction', { showDirectoryPicker: 1, logger: { warn() {} } }],
    ['LoggerMissing', { showDirectoryPicker() {} }],
  ])('%s_Rejects', async (_name, options) => {
    // Act / Assert
    await expect(pickSaveDirectory(options)).rejects.toThrow(TypeError);
  });
});
