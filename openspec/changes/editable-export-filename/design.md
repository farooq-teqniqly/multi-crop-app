## Context

The list is a view over the crop store and re-renders on every store change. The filename is derived at render and export time from the image name, extension, and crop color.

## Decisions

- Store an optional `name` (base name, no extension) on each crop area, set through a new `store.rename(id, name)`. Filename derivation moves into `resolveCropFilename`, used by both the list and the exporter so they cannot diverge.
- Sanitizing lives in `normalizeCropName` in `crop-filename.js` as pure logic: removes characters illegal on Windows, trims spaces and trailing dots, and rejects empty and reserved device names.
- The row's filename is an `<input>`. Its value is the full filename; on commit the typed value is treated as a base name, so the extension cannot change. The tooltip is the input's `title`.
- Duplicate detection lives in the list because only it knows the image name and extension. It reports rejections through an injected `onRejected(message)`, wired to the existing crop warning alert.
- Base-name selection runs on focus and on click, because the mouse-up after a click otherwise clears a selection made on focus, and a re-render can replace the focused input.

## Risks

- A re-render during editing (for example a canvas click) first blurs the input, which commits the edit.
