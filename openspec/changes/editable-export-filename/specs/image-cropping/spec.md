## MODIFIED Requirements

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

## ADDED Requirements

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
