import { describe, expect, it, vi } from 'vitest';
import { pickImageFile } from '../../src/image/image-picker.js';

describe('pickImageFile', () => {
  it('UserPicksFile_ReturnsFile', async () => {
    // Arrange
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const showOpenFilePicker = vi
      .fn()
      .mockResolvedValue([{ getFile: async () => file }]);
    const logger = { warn: vi.fn() };

    // Act
    const result = await pickImageFile({ showOpenFilePicker, logger });

    // Assert
    expect(result).toBe(file);
  });

  it('UserCancels_ReturnsNullAndLogsWarning', async () => {
    // Arrange
    const abort = new DOMException('canceled', 'AbortError');
    const showOpenFilePicker = vi.fn().mockRejectedValue(abort);
    const logger = { warn: vi.fn() };

    // Act
    const result = await pickImageFile({ showOpenFilePicker, logger });

    // Assert
    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('PickerFailsUnexpectedly_Rethrows', async () => {
    // Arrange
    const failure = new Error('boom');
    const showOpenFilePicker = vi.fn().mockRejectedValue(failure);
    const logger = { warn: vi.fn() };

    // Act / Assert
    await expect(pickImageFile({ showOpenFilePicker, logger })).rejects.toBe(
      failure,
    );
  });

  it.each([
    ['OptionsMissing', undefined],
    ['PickerNotFunction', { showOpenFilePicker: 1, logger: { warn() {} } }],
    ['LoggerMissing', { showOpenFilePicker() {} }],
  ])('%s_Rejects', async (_name, options) => {
    // Act / Assert
    await expect(pickImageFile(options)).rejects.toThrow(TypeError);
  });
});
