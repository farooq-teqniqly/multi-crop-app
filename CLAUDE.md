# multi-crop-app conventions

@CLAUDE-baseline-js.md
@CLAUDE-vanilla-js-ui.md

The two imported files are synced copies of the shared templates (source of truth:
`farooq-teqniqly/claude-templates`). Rules below are project-specific and win where they
conflict with the imports.

## What this is

A local, single-user web app for cropping several regions out of one image in
one pass. Open an image, draw up to 20 crop rectangles on it (color-coded,
resizable, deletable, mirrored in a side list), pick a save folder, click
Crop, get one file per region named `[imageName]_[color].[ext]`.

Design source: Excalidraw scene "Image Multi-crop App"
(workspace `6j1MAp71g2z`, scene `1Sm4DiTI2vu`).

## Overrides of the imported conventions

- **Vite is allowed.** The UI template's "no bundler, no build step" rule does not apply:
  `npm run dev` serves the app and `npm run build` produces a static bundle.
- **File layout is not imposed.** The UI template's `src/web/` static root, `tests/web/`
  mirror, and `js/main.js` / `css/app.css` paths do not apply; organize as Vite
  conventions and the feature's needs dictate. Its other rules (side-effect-free modules
  on import, grouping by feature) still hold.
- **Bootstrap** is used as the template describes (pinned CDN with SRI, Bootstrap Icons).
- **Attribution** is the line in the Attribution section below, not a
  `Co-Authored-By` trailer.

## Design language

Follow the Trainfree app's look
([farooq-teqniqly/trainfree](https://github.com/farooq-teqniqly/trainfree), see
`src/Trainfree.Admin/wwwroot/css/app.css` and `docs/ui-decisions.md`), which is the
[Bootstrap 5 dashboard example](https://getbootstrap.com/docs/5.0/examples/dashboard/#)
with these brand values, overridden in the project's one custom stylesheet:

- **Shell:** full-width dark sticky navbar carrying the brand, above a light
  `bg-body-tertiary` sidebar rail (fixed 240px from `md` up) beside the main content.
  This is where the color-coded crop list lives.
- **Typeface:** Inter (400/500/600/700) from Google Fonts with `preconnect` hints and no
  SRI hash, falling back to `system-ui, -apple-system, sans-serif`.
- **Primary button:** black `.btn-primary` (`#000`, `#1a1a1a` on hover/focus/active).
- **Links:** `#0071c1`. **Focus ring:** `0 0 0 0.1rem white, 0 0 0 0.25rem #258cfb`.
- **Surfaces:** bordered cards/panels using `var(--bs-border-color)`, `0.375rem` radius,
  `var(--bs-tertiary-bg)` for headers and muted areas, `var(--bs-secondary-color)` for
  secondary text. Prefer Bootstrap variables over hard-coded grays.
- **Icons:** Bootstrap Icons only; the brand mark is the one inline-SVG exception.
- **Versions:** Bootstrap 5.3.8 and Bootstrap Icons 1.13.1 (jsDelivr, pinned, SRI), matching
  Trainfree until deliberately bumped.

The crop-rectangle palette (the per-region colors in filenames) is separate from the UI
brand and is defined by the Excalidraw design.

## Stack additions

- **File System Access API** (`showOpenFilePicker`, `showDirectoryPicker`,
  directory-handle writes) for opening the image, picking the save folder,
  and exporting cropped files. No backend file I/O. Chromium-only by nature
  of this API -- not a bug, a known limitation for this local single-user tool.
- **Canvas 2D** for rendering the image and the crop-rectangle overlay
  (drawing, resizing, hit-testing, selection highlight).
- Prefer unit-testing pure logic (crop geometry, filename generation,
  selection/list-sync state) over mocking DOM or File System Access API calls.
  Picker-driven flows get a manual browser verification pass instead.

## Commands

- `npm install`, `npm run dev`, `npm test`, `npx eslint .`, `npx prettier --check .`
- Run `git config core.hooksPath .githooks` once after cloning until the `prepare`
  script exists (see issue #1); without it the hooks silently never run.

## Rules

- Crop operations must always read from the original, full-resolution image
  data -- never from a display-scaled copy of the canvas.

## Attribution

Whenever an attribution would be added -- PR descriptions, PR comments, issue
comments, and commit messages included -- write this instead of any default
"Generated with Claude Code" / `Co-Authored-By` line:

*Created by Farooq et Machina<sup>TM</sup>*

## OpenSpec workflow

This repo uses OpenSpec with the `teqniqly-express` schema (intent = GitHub
milestone, specs, tasks = GitHub issues, no separate proposal/design docs).
See `.claude/commands/opsx/*.md` and the schema's own instructions
(`openspec schema which teqniqly-express`) for the phase-by-phase flow.
