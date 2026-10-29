/**
 * @typedef {object} CropColor
 * @property {string} name Lowercase, filename-safe color name.
 * @property {string} hex Color as a lowercase `#rrggbb` string.
 */

/**
 * The fixed palette of crop-area colors; as large as the 20-area cap so every existing area can
 * have its own color.
 * @type {ReadonlyArray<Readonly<CropColor>>}
 */
export const PALETTE = Object.freeze(
  [
    ['red', '#e03131'],
    ['green', '#2f9e44'],
    ['blue', '#1971c2'],
    ['orange', '#f08c00'],
    ['purple', '#9c36b5'],
    ['yellow', '#fcc419'],
    ['teal', '#0ca678'],
    ['pink', '#f783ac'],
    ['cyan', '#15aabf'],
    ['lime', '#94d82d'],
    ['indigo', '#4263eb'],
    ['brown', '#8d5a2b'],
    ['magenta', '#c2255c'],
    ['navy', '#1b2a6b'],
    ['maroon', '#7a1f1f'],
    ['olive', '#6b7a1a'],
    ['gray', '#868e96'],
    ['black', '#212529'],
    ['sky', '#74c0fc'],
    ['salmon', '#ffa8a8'],
  ].map(([name, hex]) => Object.freeze({ name, hex })),
);

/**
 * Chooses the color for a new crop area: the first palette color not in use. When every color is
 * in use, cycles through the palette by the number of areas.
 * @param {ReadonlyArray<CropColor>} palette Colors in assignment order.
 * @param {ReadonlyArray<string>} usedNames Names of the colors existing crop areas use.
 * @returns {CropColor} The chosen color.
 * @throws {TypeError} When palette or usedNames is not an array.
 * @throws {RangeError} When palette is empty.
 */
export function pickColor(palette, usedNames) {
  if (!Array.isArray(palette)) {
    throw new TypeError('palette must be an array.');
  }
  if (palette.length === 0) {
    throw new RangeError('palette must not be empty.');
  }
  if (!Array.isArray(usedNames)) {
    throw new TypeError('usedNames must be an array.');
  }
  const used = new Set(usedNames);
  const free = palette.find((color) => !used.has(color.name));
  return free ?? palette[usedNames.length % palette.length];
}
