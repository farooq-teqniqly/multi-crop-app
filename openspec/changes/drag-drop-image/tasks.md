## 1. Pure drop helper

- [x] 1.1 Add a failing test `tests/image/dropped-file.test.js` for `pickDroppedFile` (first file returned, empty list returns null, multiple files returns first, missing or wrong-type argument throws TypeError) and confirm it fails for the right reason
- [x] 1.2 Implement `src/image/dropped-file.js` with JSDoc and argument validation, and verify `npm test` passes the new tests

## 2. Shared open path

- [x] 2.1 Extract `openFile(file)` from `openImage()` in `src/main.js` so the picker flow is "pick, then `openFile`", and verify existing tests pass and opening via the picker still works in the browser

## 3. Drop wiring

- [x] 3.1 Add dragenter/dragover/dragleave/drop listeners on `#canvas-panel` that react only to file drags, toggle the highlight with a depth counter, and call `openFile` with the dropped file, and verify dropping a png, jpg, and gif in the browser opens each
- [x] 3.2 Add window-level dragover/drop `preventDefault` for file drags, and verify a drop outside the panel does not navigate the tab
- [x] 3.3 Ignore drops while `isExporting`, and surface failures (unsupported file, no file) through the existing error alert, and verify dropping a .txt shows an error and leaves the current image and crops unchanged
- [x] 3.4 Add the `.drop-active` highlight to `src/css/app.css` using Bootstrap variables, and verify it appears during a drag and clears on leave and on drop with no flicker over child canvases

## 4. Verification

- [x] 4.1 Run `npm test`, `npx eslint .`, and `npx prettier --check .` and verify all pass
- [x] 4.2 Manual browser pass in Chromium: drop onto an empty panel, drop over an image with crops (crops cleared), drop several files (first opens), drop during export (ignored), and picker still works
