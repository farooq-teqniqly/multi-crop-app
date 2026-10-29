import { describe, expect, it } from 'vitest';
import { PALETTE, pickColor } from '../../src/crops/crop-palette.js';

describe('PALETTE', () => {
  it('Palette_HasTwentyEntries', () => {
    // Arrange / Act / Assert
    expect(PALETTE).toHaveLength(20);
  });

  it.each(['name', 'hex'])('Palette_HasUnique%sValues', (field) => {
    // Arrange
    const values = PALETTE.map((color) => color[field]);

    // Act
    const unique = new Set(values);

    // Assert
    expect(unique.size).toBe(PALETTE.length);
  });

  it.each(PALETTE.map((color) => [color.name, color]))(
    '%s_HasFilenameSafeNameAndHexValue',
    (_name, color) => {
      // Arrange / Act / Assert
      expect(color.name).toMatch(/^[a-z]+$/);
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    },
  );

  it('Palette_IsFrozen', () => {
    // Arrange / Act / Assert
    expect(Object.isFrozen(PALETTE)).toBe(true);
    expect(PALETTE.every((color) => Object.isFrozen(color))).toBe(true);
  });
});

describe('pickColor', () => {
  const palette = [
    { name: 'red', hex: '#e03131' },
    { name: 'green', hex: '#2f9e44' },
    { name: 'blue', hex: '#1971c2' },
  ];

  it.each([
    ['NothingInUse', [], 'red'],
    ['FirstInUse', ['red'], 'green'],
    ['FirstTwoInUse', ['green', 'red'], 'blue'],
    ['FirstFreedAfterRemoval', ['green', 'blue'], 'red'],
  ])('%s_ReturnsFirstUnusedColor', (_name, used, expected) => {
    // Arrange / Act
    const color = pickColor(palette, used);

    // Assert
    expect(color.name).toBe(expected);
  });

  it.each([
    ['AllInUseOnce', ['red', 'green', 'blue'], 'red'],
    ['AllInUseFourAreas', ['red', 'green', 'blue', 'red'], 'green'],
  ])('%s_CyclesThroughPalette', (_name, used, expected) => {
    // Arrange / Act
    const color = pickColor(palette, used);

    // Assert
    expect(color.name).toBe(expected);
  });

  it.each([
    ['PaletteNotArray', 'red', [], TypeError],
    ['PaletteEmpty', [], [], RangeError],
    ['UsedNotArray', palette, 'red', TypeError],
  ])('%s_Throws', (_name, badPalette, used, errorType) => {
    // Arrange / Act / Assert
    expect(() => pickColor(badPalette, used)).toThrow(errorType);
  });
});
