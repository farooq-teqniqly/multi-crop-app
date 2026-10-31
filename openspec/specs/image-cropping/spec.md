## Purpose

Lets a user visually mark several regions of one opened image and export each region as its own correctly named image file in a single action.

## Requirements

### Requirement: Open and render an image
The system SHALL let the user pick a local image file (jpeg, png, or gif) and render it for cropping, keeping access to the image's full, unscaled pixel data regardless of how it is displayed. For an animated gif, the system SHALL render and crop from the first frame only; later frames are neither displayed nor exported.
**Rationale**: Crop output must come from full-resolution data even if the display is scaled to fit the panel; losing the unscaled source would make every exported crop quality-degraded. A crop is a single static region, so one well-defined frame is the source; decoding an animated gif to its first frame is what the browser's image decoding does by default.

#### Scenario: Image opens and displays
- **WHEN** the user opens a jpeg, png, or gif file
- **THEN** the image is rendered in the canvas and its full-resolution pixel data remains available for later cropping

#### Scenario: Animated gif uses its first frame
- **WHEN** the user opens an animated gif
- **THEN** the canvas shows the gif's first frame and every later crop is taken from that first frame's pixels

### Requirement: Create a crop area by dragging
The system SHALL let the user create a new crop rectangle by dragging on the displayed image, assigning it the first color, in fixed palette order, that no other existing crop area is using. The palette SHALL contain 20 distinct, named colors (red, green, blue, orange, purple, yellow, teal, pink, cyan, lime, indigo, brown, magenta, navy, maroon, olive, gray, black, sky, salmon).
**Rationale**: Color is the only thing distinguishing crop areas on the canvas and in the list, so every new area needs a color the moment it exists. The palette is as large as the 20-area cap, so every existing crop area always has its own color and therefore its own filename.

#### Scenario: Drag creates a colored crop rectangle
- **WHEN** the user drags on the image to define a rectangle
- **THEN** a new crop area is created with bounds matching the drag and a color assigned from the palette that no other existing crop area is using

#### Scenario: Deleted area's color is reused
- **WHEN** a crop area is deleted and the user then creates a new crop area
- **THEN** the new area receives the first palette color not in use, which may be the color freed by the deletion

### Requirement: Resize an existing crop area
The system SHALL let the user select a crop rectangle by clicking it and resize it by dragging its handles.
**Rationale**: Freehand drags are imprecise; resize-after-selection is how the user corrects a crop area's bounds without recreating it.

#### Scenario: Selected crop area resizes
- **WHEN** the user clicks a crop rectangle, then drags one of its resize handles
- **THEN** the rectangle's bounds update to follow the drag and the change is reflected immediately on the canvas

### Requirement: Delete a crop area from either view
The system SHALL let the user delete a crop area via a delete control on the canvas rectangle or on its matching list row, removing it from both views.
**Rationale**: The canvas and the list are two views onto the same crop-area state; deleting from one with no effect on the other would leave the two out of sync.

#### Scenario: Deleting from the canvas updates the list
- **WHEN** the user clicks a crop rectangle's delete control on the canvas
- **THEN** the crop area is removed and its row disappears from the list

#### Scenario: Deleting from the list updates the canvas
- **WHEN** the user clicks a list row's delete control
- **THEN** the crop area is removed and its rectangle disappears from the canvas

### Requirement: Cap crop areas at 20
The system SHALL reject creation of a 21st crop area and tell the user why.
**Rationale**: An unbounded number of crop areas would make the list and canvas unusable and was explicitly capped in the design.

#### Scenario: 21st crop area is rejected
- **WHEN** 20 crop areas already exist and the user attempts to drag out a new one
- **THEN** no new crop area is created and the user is told the 20-area limit was reached

### Requirement: Crop list mirrors crop areas with default filenames
The system SHALL show one list row per crop area, each displaying its color swatch and a filename of the form `[name].[ext]`, where `ext` comes from the opened file (png for a gif) and `name` defaults to `[imageName]_[color]` until the user edits it. The row SHALL expose the full filename as a tooltip.
**Rationale**: The filename is what gets written on export; showing it up front lets the user see the export result before clicking Crop, and the tooltip keeps a long name readable when the sidebar truncates it.

#### Scenario: List row shows the default filename
- **WHEN** a crop area is created for an image named `photo.png`
- **THEN** its list row shows the matching color swatch and the filename `photo_<color>.png`

#### Scenario: Every crop area has a unique default filename
- **WHEN** 20 crop areas exist for an image named `photo.png`
- **THEN** each has a different color and so a different default filename `photo_<color>.png`, with no numeric suffix needed

#### Scenario: Tooltip shows the full filename
- **WHEN** the user hovers a row whose filename is cut off
- **THEN** a tooltip shows the entire filename including its extension

### Requirement: Selection stays synced between canvas and list
The system SHALL highlight a crop area consistently whether it was selected by clicking its canvas rectangle or its list row.
**Rationale**: The user tracks which area they're working on by its highlight; a one-directional sync would make the list or the canvas untrustworthy as a selection indicator.

#### Scenario: Selecting a list row highlights the canvas rectangle
- **WHEN** the user clicks a crop area's list row
- **THEN** the matching rectangle is highlighted as selected on the canvas

#### Scenario: Selecting a canvas rectangle highlights the list row
- **WHEN** the user clicks a crop rectangle on the canvas
- **THEN** the matching row is highlighted as selected in the list

### Requirement: Choose a save location
The system SHALL let the user pick a destination folder for exported crops, and remember that choice for the rest of the session.
**Rationale**: Every crop area exports to the same folder in one action, so the folder is chosen once up front rather than per file.

#### Scenario: Folder picker sets the save location
- **WHEN** the user picks a folder via the save-location control
- **THEN** that folder is used as the destination for all subsequent Crop exports in the session

### Requirement: Export all crop areas on Crop
The system SHALL, when the user clicks Crop, write one image file per existing crop area into the chosen save location, named per the default-filename convention, cropped from the original full-resolution image data. For a gif source, each exported file SHALL be written as png instead, since canvas-based re-encoding does not support gif output; the default filename's extension changes to `.png` accordingly. When a gif is opened, the system SHALL notify the user at that point that exported files will be png, not gif, so the format change is known before cropping.
**Rationale**: Exporting from a display-scaled copy would silently degrade output quality; the full-resolution source must be the one basis for every exported file. Canvas `toBlob`/`convertToBlob` only support png/jpeg/webp, so gif input needs an explicit fallback rather than silently failing.

#### Scenario: Crop writes one file per area
- **WHEN** the user has 3 crop areas defined and a save location chosen, then clicks Crop
- **THEN** 3 image files are written to the save location, one per crop area, each named `[imageName]_[color].[ext]` and containing the pixels from that area's bounds on the original image

#### Scenario: Opening a GIF warns of the PNG format change
- **WHEN** the user opens a gif file
- **THEN** the app displays a visible, non-blocking notice that exported crops will be saved as png, not gif
- **AND** the notice stays visible while that gif is open and is not shown for jpeg or png files

#### Scenario: GIF source exports as PNG
- **WHEN** the opened image is a gif and the user clicks Crop
- **THEN** each exported file is written as png with the filename's extension changed to `.png`

### Requirement: Rename a crop area's export filename
The system SHALL let the user edit the base name of a crop area's filename in its list row. Focusing the filename SHALL select the base name and leave the extension unselected, and the extension SHALL stay fixed. Illegal filename characters SHALL be removed. An empty name, or a name that matches another crop area's filename ignoring case, SHALL be rejected: the previous name is restored and the user is told why.
**Rationale**: Selecting only the base name lets the user type a replacement at once, and rejecting empty or duplicate names prevents an export that silently overwrites one crop with another.

#### Scenario: Focusing the filename selects the base name
- **WHEN** the user clicks the filename `photo_red.png`
- **THEN** `photo_red` is selected and `.png` is not

#### Scenario: Committing a new name
- **WHEN** the user types `hero` and presses Enter
- **THEN** the row shows `hero.png` and Crop writes that crop to `hero.png`

#### Scenario: Extension cannot be changed
- **WHEN** the user submits `hero.jpg` for a png export
- **THEN** the row shows `hero.jpg.png`

#### Scenario: Empty name is rejected
- **WHEN** the user clears the base name and commits
- **THEN** the previous filename is restored and the user is told the name cannot be empty

#### Scenario: Duplicate name is rejected
- **WHEN** the user commits a name that another crop area's filename already has, ignoring case
- **THEN** the previous filename is restored and the user is told the name is already used

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

## Decisions

- Chose Vite + vanilla JavaScript + Canvas 2D + the File System Access API over Electron for the implementation, because this is a local single-user tool where a browser tab is sufficient and avoids desktop-app packaging/distribution. Electron would become the right choice if the app needed cross-browser support or an installable offline distributable.
- Chose a fixed palette of 20 distinct, named colors for crop areas (not numbered labels), matching the mockup's color-only distinction between areas. The palette is exactly as large as the 20-area cap, so every existing crop area has a unique color and therefore a unique default filename; a new area takes the first color no other existing area is using, and a deleted area's color becomes available again. The earlier plan of repeating colors with a `-2`, `-3`, ... filename suffix was dropped because it is unreachable under the cap. It would return if the cap were ever raised above the palette size. List rows and selection sync stay correct by crop-area identity, not by color.
- Chose png as the export fallback for gif-sourced crops, because canvas-based re-encoding (`toBlob`/`convertToBlob`) only supports png/jpeg/webp; png was picked over jpeg to preserve lossless/transparent pixels, matching gif's typical use. This would be revisited if animated-gif export were ever required (out of scope here -- a crop is a single static region).
- Chose first-frame-only handling for animated gifs: the opened image is decoded to its first frame, which is shown on the canvas and is the sole source for every crop, rather than offering frame selection or animated output. Frame selection and animated export are out of scope; they would be revisited together with animated-gif export.
- Chose delete-and-redraw over moving for repositioning a crop area: the user can resize an area with its handles or delete it and draw a new one, but dragging an existing area does not move it. A drag that starts on an area's body draws a new area. Moving a crop area is out of scope; it would be revisited if drag-to-move proves worth the added interaction rules.
- Chose a fixed hit-test priority for overlapping crop areas: the selected area's resize handles first, then its delete control, then area bodies newest first, and otherwise empty image where a drag starts a new area. Clicking an area's body selects the topmost one under the pointer; there is no click-cycling through stacked areas.
- Chose to scale the displayed canvas to fit the main panel while retaining the original image's full-resolution pixel data for cropping, rather than always rendering at natural size, so large images stay usable in a fixed-size panel without degrading exported crop quality.
