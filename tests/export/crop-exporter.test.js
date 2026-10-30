import { describe, expect, it, vi } from 'vitest';
import { exportCrops } from '../../src/export/crop-exporter.js';

function setup({
  extension = 'png',
  failOn = null,
  crops,
  existing = [],
  writeError = null,
  closeError = null,
  removeError = null,
  foreignContent = false,
  inspectError = null,
} = {}) {
  const drawn = [];
  const encoded = [];
  const files = new Map();
  const closed = [];
  const aborted = [];
  const bitmap = { id: 'full-res' };
  const image = { bitmap, name: 'photo', extension, width: 1000, height: 500 };
  const createCanvas = (width, height) => {
    const size = { width, height };
    return {
      getContext: () => ({
        drawImage: (...args) => drawn.push({ canvas: size, args }),
      }),
      toBlob: (callback, mimeType, quality) => {
        encoded.push({ mimeType, quality });
        callback(new Blob(['x'], { type: mimeType }));
      },
    };
  };
  const entries = new Set(existing);
  const sizes = new Map(existing.map((name) => [name, 1]));
  const removed = [];
  const directory = {
    getFileHandle: async (name, options) => {
      if (name === failOn) {
        throw new Error(`cannot create ${name}`);
      }
      if (options?.create !== true && !entries.has(name)) {
        throw new DOMException('not found', 'NotFoundError');
      }
      if (!entries.has(name)) {
        sizes.set(name, 0);
      }
      entries.add(name);
      return {
        getFile: async () => {
          if (inspectError !== null) {
            throw inspectError;
          }
          return { size: foreignContent ? 1 : sizes.get(name) };
        },
        createWritable: async () => {
          let pending = null;
          return {
            write: async (blob) => {
              if (writeError !== null) {
                throw writeError;
              }
              pending = blob;
              files.set(name, { blob, options });
            },
            close: async () => {
              if (closeError !== null) {
                throw closeError;
              }
              sizes.set(name, pending.size);
              closed.push(name);
            },
            abort: async () => aborted.push(name),
          };
        },
      };
    },
    removeEntry: async (name) => {
      if (removeError !== null) {
        throw removeError;
      }
      entries.delete(name);
      sizes.delete(name);
      removed.push(name);
    },
  };
  const list = crops ?? [
    { id: 'a', x: 10, y: 20, width: 100, height: 50, color: { name: 'red' } },
    { id: 'b', x: 200, y: 0, width: 30, height: 40, color: { name: 'blue' } },
  ];
  return {
    image,
    crops: list,
    directory,
    createCanvas,
    logger: { warn: vi.fn() },
    drawn,
    encoded,
    files,
    closed,
    aborted,
    removed,
    entries,
    bitmap,
  };
}

function run(ctx) {
  return exportCrops({
    image: ctx.image,
    crops: ctx.crops,
    directory: ctx.directory,
    createCanvas: ctx.createCanvas,
    logger: ctx.logger,
  });
}

describe('exportCrops', () => {
  it('TwoCrops_WritesTwoNamedFiles', async () => {
    // Arrange
    const ctx = setup();

    // Act
    const result = await run(ctx);

    // Assert
    expect(result).toEqual({
      written: ['photo_red.png', 'photo_blue.png'],
      failed: [],
    });
    expect([...ctx.files.keys()]).toEqual(['photo_red.png', 'photo_blue.png']);
    expect(ctx.closed).toEqual(['photo_red.png', 'photo_blue.png']);
  });

  it('EachCrop_DrawsFromFullResolutionBitmapAtPixelRect', async () => {
    // Arrange
    const ctx = setup();

    // Act
    await run(ctx);

    // Assert
    expect(ctx.drawn[0].args).toEqual([
      ctx.bitmap,
      10,
      20,
      100,
      50,
      0,
      0,
      100,
      50,
    ]);
    expect(ctx.drawn[1].args).toEqual([
      ctx.bitmap,
      200,
      0,
      30,
      40,
      0,
      0,
      30,
      40,
    ]);
    expect(ctx.drawn[0].canvas).toEqual({ width: 100, height: 50 });
  });

  it('ExistingFile_IsOverwrittenByCreatingHandle', async () => {
    // Arrange
    const ctx = setup();

    // Act
    await run(ctx);

    // Assert
    expect(ctx.files.get('photo_red.png').options).toEqual({ create: true });
  });

  it('GifSource_WritesPngFilesWithPngMime', async () => {
    // Arrange
    const ctx = setup({ extension: 'gif' });

    // Act
    const result = await run(ctx);

    // Assert
    expect(result.written).toEqual(['photo_red.png', 'photo_blue.png']);
    expect(ctx.encoded[0].mimeType).toBe('image/png');
  });

  it('JpegSource_EncodesJpegWithHighQualityAndKeepsExtension', async () => {
    // Arrange
    const ctx = setup({ extension: 'jpg' });

    // Act
    const result = await run(ctx);

    // Assert
    expect(result.written[0]).toBe('photo_red.jpg');
    expect(ctx.encoded[0]).toEqual({ mimeType: 'image/jpeg', quality: 0.95 });
  });

  it('OneFileFails_OthersStillWrittenAndFailureReported', async () => {
    // Arrange
    const ctx = setup({ failOn: 'photo_red.png' });

    // Act
    const result = await run(ctx);

    // Assert
    expect(result.written).toEqual(['photo_blue.png']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].name).toBe('photo_red.png');
    expect(result.failed[0].error).toBeInstanceOf(Error);
    expect(ctx.logger.warn).toHaveBeenCalledOnce();
  });

  it('WriteFailsAfterOpen_AbortsWritable', async () => {
    // Arrange
    const failure = new Error('disk full');
    const ctx = setup({ writeError: failure });

    // Act
    const result = await run(ctx);

    // Assert
    expect(result.written).toEqual([]);
    expect(result.failed.map((entry) => entry.error)).toEqual([
      failure,
      failure,
    ]);
    expect(ctx.aborted).toEqual(['photo_red.png', 'photo_blue.png']);
    expect(ctx.closed).toEqual([]);
  });

  it('CloseFails_AbortsWritableAndReportsFailure', async () => {
    // Arrange
    const failure = new Error('flush failed');
    const ctx = setup({ closeError: failure });

    // Act
    const result = await run(ctx);

    // Assert
    expect(result.written).toEqual([]);
    expect(result.failed.map((entry) => entry.error)).toEqual([
      failure,
      failure,
    ]);
    expect(ctx.aborted).toEqual(['photo_red.png', 'photo_blue.png']);
  });

  it('NewFileWriteFails_RemovesCreatedEntry', async () => {
    // Arrange
    const ctx = setup({ writeError: new Error('disk full') });

    // Act
    await run(ctx);

    // Assert
    expect(ctx.removed).toEqual(['photo_red.png', 'photo_blue.png']);
    expect(ctx.entries.size).toBe(0);
  });

  it('NewFileCloseFails_RemovesCreatedEntry', async () => {
    // Arrange
    const ctx = setup({ closeError: new Error('flush failed') });

    // Act
    await run(ctx);

    // Assert
    expect(ctx.removed).toEqual(['photo_red.png', 'photo_blue.png']);
  });

  it('NewFileWriteFailsButEntryHasContent_DoesNotRemoveAndLogsWarning', async () => {
    // Arrange
    const failure = new Error('disk full');
    const ctx = setup({
      crops: [
        {
          id: 'a',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          color: { name: 'red' },
        },
      ],
      writeError: failure,
      foreignContent: true,
    });

    // Act
    const result = await run(ctx);

    // Assert
    expect(ctx.removed).toEqual([]);
    expect(ctx.entries.has('photo_red.png')).toBe(true);
    expect(result.failed[0].error).toBe(failure);
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      'skipped removing export file that has content',
      { name: 'photo_red.png' },
    );
  });

  it('InspectingEntryFails_DoesNotRemoveAndLogsWarning', async () => {
    // Arrange
    const failure = new Error('disk full');
    const ctx = setup({
      crops: [
        {
          id: 'a',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          color: { name: 'red' },
        },
      ],
      writeError: failure,
      inspectError: new Error('denied'),
    });

    // Act
    const result = await run(ctx);

    // Assert
    expect(ctx.removed).toEqual([]);
    expect(result.failed[0].error).toBe(failure);
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      'could not inspect partial export file',
      { name: 'photo_red.png', message: 'denied' },
    );
  });

  it('PreExistingFileWriteFails_FileIsNotRemoved', async () => {
    // Arrange
    const ctx = setup({
      existing: ['photo_red.png'],
      writeError: new Error('disk full'),
    });

    // Act
    await run(ctx);

    // Assert
    expect(ctx.removed).toEqual(['photo_blue.png']);
    expect(ctx.entries.has('photo_red.png')).toBe(true);
  });

  it('RemoveEntryFails_LogsAndStillReportsOriginalFailure', async () => {
    // Arrange
    const failure = new Error('disk full');
    const ctx = setup({
      crops: [
        {
          id: 'a',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          color: { name: 'red' },
        },
      ],
      writeError: failure,
      removeError: new Error('locked'),
    });

    // Act
    const result = await run(ctx);

    // Assert
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toBe(failure);
    expect(ctx.logger.warn).toHaveBeenCalledTimes(2);
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      'could not remove partial export file',
      { name: 'photo_red.png', message: 'locked' },
    );
  });

  it('GetFileHandleFailsOtherThanNotFound_ReportsFailureWithoutRemoving', async () => {
    // Arrange
    const ctx = setup({ failOn: 'photo_red.png' });

    // Act
    await run(ctx);

    // Assert
    expect(ctx.removed).toEqual([]);
  });

  it('EncodeReturnsNull_ReportsFailure', async () => {
    // Arrange
    const ctx = setup();
    const original = ctx.createCanvas;
    ctx.createCanvas = (width, height) => ({
      ...original(width, height),
      toBlob: (callback) => callback(null),
    });

    // Act
    const result = await run(ctx);

    // Assert
    expect(result.written).toEqual([]);
    expect(result.failed).toHaveLength(2);
  });

  it('NoCrops_WritesNothing', async () => {
    // Arrange
    const ctx = setup({ crops: [] });

    // Act
    const result = await run(ctx);

    // Assert
    expect(result).toEqual({ written: [], failed: [] });
  });

  it.each([
    ['OptionsMissing', () => undefined],
    ['ImageMissing', (base) => ({ ...base, image: null })],
    ['CropsNotArray', (base) => ({ ...base, crops: 'x' })],
    ['DirectoryMissing', (base) => ({ ...base, directory: {} })],
    ['CreateCanvasNotFunction', (base) => ({ ...base, createCanvas: 1 })],
    ['LoggerMissing', (base) => ({ ...base, logger: {} })],
  ])('%s_Rejects', async (_name, mutate) => {
    // Arrange
    const ctx = setup();
    const base = {
      image: ctx.image,
      crops: ctx.crops,
      directory: ctx.directory,
      createCanvas: ctx.createCanvas,
      logger: ctx.logger,
    };

    // Act / Assert
    await expect(exportCrops(mutate(base))).rejects.toThrow(TypeError);
  });
});
