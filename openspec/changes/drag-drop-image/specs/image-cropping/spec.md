## ADDED Requirements

### Requirement: Open an image by dropping it onto the canvas
The system SHALL let the user open an image by dragging a local jpeg, png, or gif file from outside the browser and dropping it onto the canvas panel. A dropped image SHALL behave exactly like one chosen with the file picker: it replaces the current image, discards all existing crop areas, clears any export result message, and shows the gif notice for a gif. While a file is dragged over the panel the system SHALL show a visible drop highlight, and SHALL remove it when the drag leaves or the file is dropped. When more than one file is dropped, the system SHALL open only the first. The system SHALL ignore drops while an export is in progress.
**Rationale**: Drag-and-drop is the fastest way to get an image in; sharing the picker's open behavior keeps crop state, naming, and full-resolution handling identical regardless of how the image arrived.

#### Scenario: Dropped image opens and displays
- **WHEN** the user drops a jpeg, png, or gif file onto the canvas panel
- **THEN** the image is rendered in the canvas, its full-resolution pixel data remains available for cropping, and any previously drawn crop areas are discarded

#### Scenario: Drop highlight follows the drag
- **WHEN** the user drags a file over the canvas panel and then moves it away or drops it
- **THEN** a drop highlight is shown while the file is over the panel and is removed once it leaves or is dropped

#### Scenario: Unsupported file is rejected
- **WHEN** the user drops a file that is not a jpeg, png, or gif
- **THEN** the user is told the file could not be opened and the current image and crop areas are unchanged

#### Scenario: Multiple files open the first
- **WHEN** the user drops several image files at once
- **THEN** only the first file is opened

#### Scenario: Drop during export is ignored
- **WHEN** the user drops an image file while an export is in progress
- **THEN** the current image and crop areas are unchanged
