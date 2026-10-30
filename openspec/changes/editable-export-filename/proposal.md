## Why

Exported files are always named `[imageName]_[color].[ext]`. Users want to give a crop a meaningful name before exporting, and long names get cut off in the narrow sidebar rail.

## What Changes

- The filename in each crop list row becomes an editable text field. Clicking or tabbing into it highlights the name without its extension so typing replaces it.
- The extension is locked; only the base name is editable.
- A new name is sanitized, and an empty or duplicate name is rejected and reverted with a visible message.
- Each row shows the full filename in a tooltip, since the rail can truncate it.
- Export uses the edited name.

## Capabilities

### New Capabilities

### Modified Capabilities
- `image-cropping`: the crop list requirement gains editable filenames and a tooltip, and the export requirement uses the edited name.

## Impact

- `src/crops/crop-filename.js`, `src/crops/crop-store.js`, `src/ui/crop-list.js`, `src/export/crop-exporter.js`, `src/main.js`, `src/css/app.css`.
- Tests for each of the above.
