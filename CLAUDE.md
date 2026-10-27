# multi-crop-app conventions

## What this is

A local, single-user web app for cropping several regions out of one image in
one pass. Open an image, draw up to 20 crop rectangles on it (color-coded,
resizable, deletable, mirrored in a side list), pick a save folder, click
Crop, get one file per region named `[imageName]_[color].[ext]`.

Design source: Excalidraw scene "Image Multi-crop App"
(workspace `6j1MAp71g2z`, scene `1Sm4DiTI2vu`).

## Stack

- Vanilla JavaScript (no TypeScript), bundled with **Vite**. `npm run dev`
  serves it locally; `npm run build` produces a static bundle.
- **File System Access API** (`showOpenFilePicker`, `showDirectoryPicker`,
  directory-handle writes) for opening the image, picking the save folder,
  and exporting cropped files. No backend file I/O. Chromium-only by nature
  of this API — not a bug, a known limitation for this local single-user tool.
- **Canvas 2D** for rendering the image and the crop-rectangle overlay
  (drawing, resizing, hit-testing, selection highlight).
- **Vitest** for unit tests. Prefer testing pure logic (crop geometry,
  filename generation, selection/list-sync state) over mocking DOM or File
  System Access API calls. Picker-driven flows get a manual browser
  verification pass instead.
- **ESLint + Prettier** for lint/format; enforced by `.githooks/pre-commit`.

## Commands

- `npm install`
- `npm run dev` — local dev server
- `npm test` — Vitest
- `npx eslint .` / `npx prettier --check .`

## Conventions

- U.S. English spelling in prose, comments, commits, docs.
- No comments that restate what the code says; comment only non-obvious
  rationale (a workaround, a browser quirk, a subtle invariant).
- **Conventional Commits**, enforced by `.githooks/commit-msg`:
  `<type>(<scope>)!: <description>`. Types: `feat fix docs style refactor
  perf test build ci chore revert`. Do not skip hooks (`--no-verify`) unless
  explicitly asked.
- Crop operations must always read from the original, full-resolution image
  data — never from a display-scaled copy of the canvas.

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
