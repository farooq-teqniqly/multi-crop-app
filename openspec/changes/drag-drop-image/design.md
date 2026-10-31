## Context

Opening an image runs `openImage()` in `src/main.js`: pick a file, `loadImage(file)`, then `session.commit(ticket, image)` and reset crop state. `createImageSession` tickets already make overlapping opens resolve to the latest. Only the pick step is picker-specific. See proposal.md for motivation and the spec delta for required behavior.

## Goals / Non-Goals

**Goals:**
- Reuse the existing load/commit/reset path so picker and drop cannot drift apart.
- Keep new logic pure and unit-testable; keep DOM wiring in `main.js`.

**Non-Goals:**
- Dropping onto the crop list or navbar; only the canvas panel is a target.
- Multi-image sessions or opening several dropped files.
- Paste-from-clipboard or URL drops.

## Decisions

- **Extract `openFile(file)` from `openImage()`.** `openImage()` becomes "pick, then `openFile`"; the drop handler calls `openFile` with the dropped `File`. Alternative: duplicate the commit/reset block in the drop handler. Rejected: the reset list (crop store, draft, warnings, export messages) is long and would drift.
- **Drop target is `#canvas-panel`.** It is the visible, always-present region, including before any image is loaded. The stacked canvases sit inside it, so events bubble to one listener. Alternative: window-level listeners. Rejected: a stray drop elsewhere would unexpectedly replace the image.
- **Pure helper `src/image/dropped-file.js` exporting `pickDroppedFile(dataTransfer)`.** It returns the first `File` from `dataTransfer.files`, or `null` when there is none. Type validation stays in `loadImage`, which already rejects unsupported files with a `TypeError`; that message surfaces through the existing error alert. Alternative: a second type check in the helper. Rejected: duplicates `loadImage`'s MIME/extension fallback logic.
- **Drag-over detection checks `dataTransfer.types` includes `'Files'`.** This avoids highlighting for dragged text or page elements. `dragover` calls `preventDefault()` only for file drags, so the browser's default "navigate to the file" never fires on a valid target.
- **Highlight via a class toggle with a dragenter/dragleave depth counter.** Child elements fire `dragleave` when the pointer crosses them, which flickers the highlight; a counter incremented on `dragenter` and decremented on `dragleave`, reset on `drop`, avoids that. Style lives in `src/css/app.css` using Bootstrap variables.
- **Ignore drops during export.** Guard on the existing `isExporting` flag, mirroring the disabled Open button. `runExport` already calls `session.begin()` to supersede pending opens, so the guard is a UX consistency check, not a correctness requirement.
- **Gate on File System Access support?** No. Drop uses only `DataTransfer` and `createImageBitmap`, so it works even where `showOpenFilePicker` is missing. The unsupported-browser banner stays as is.
- **Prevent page-level default drop.** Add `dragover`/`drop` listeners on `window` that call `preventDefault()` for file drags, so a drop that misses the panel does not navigate the tab away from the app and lose crops.

## Risks / Trade-offs

- [Dropping outside the panel does nothing] -> Window-level `preventDefault` stops navigation; the highlight signals the real target.
- [Replaces the current image and its crops without confirmation] -> Same as the picker today; consistent behavior beats a drop-only prompt.
- [Drag counter drifts if a `dragleave` is missed] -> Reset the counter and highlight on `drop` and on `dragend`/window `dragleave` with no related target.
- [Dragging a file from a browser tab yields no `File`] -> `pickDroppedFile` returns `null`; the user sees a "no file" error.
