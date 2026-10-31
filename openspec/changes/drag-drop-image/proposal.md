## Why

Opening an image today requires the file picker. Dragging a file from the file manager onto the canvas is the faster, more natural gesture for a tool whose first step is always "get an image in."

## What Changes

- Dropping a jpeg, png, or gif file onto the canvas panel opens it exactly as the "Open image" picker would: replaces the current image, clears existing crop areas and export messages, and shows the GIF notice when applicable.
- A visible drop highlight appears on the panel while a file is dragged over it.
- Dropping an unsupported file, or no file, shows a user-visible error and leaves the current image untouched.
- When several files are dropped, only the first is used.
- Dropping is ignored while an export is running, matching the disabled "Open image" button.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `image-cropping`: adds a requirement that an image can also be opened by dropping a file onto the canvas.

## Impact

- `src/main.js`: wire drag events on the canvas panel and route the dropped file through the existing load/commit path.
- New pure module under `src/image/` for deciding whether a drag/drop carries a droppable file.
- `src/css/app.css`: drop-highlight style.
- `index.html`: no structural change expected.
- No new dependencies. The existing `loadImage`, `createImageSession`, and tests are reused.
