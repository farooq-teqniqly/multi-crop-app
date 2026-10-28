# Vanilla JS UI conventions

Front-end conventions for browser apps written in plain JavaScript. Pairs with
`CLAUDE-baseline-js.md`; the baseline's code, testing and documentation rules apply to
browser code too. No project-specific values here (palette, typeface, version pins beyond
the scaffold's) -- those belong in the consuming repo's `CLAUDE.md`.

## No framework, no build step

- No UI framework (React, Angular, Vue, Svelte, ...), no bundler, no transpiler, no
  TypeScript. The browser loads the ES modules in `src/web/` as written; what is committed
  is what runs.
- Load code with `<script type="module" src="js/main.js">`. Use relative imports with the
  `.js` extension. Never rely on a bare specifier or an import map for first-party code.
- The only third-party browser dependency is Bootstrap (CSS, JS bundle, and Bootstrap
  Icons when needed), loaded from a CDN. Add another library only when the platform has
  no reasonable equivalent, and record the decision in the project's `CLAUDE.md`.
- Dev tooling (Vitest, jsdom, ESLint, Prettier) is `devDependencies` only and never ships
  to the browser.

## Layout

- Static root is `src/web/`: `index.html`, `css/`, `js/`. Tests mirror it under
  `tests/web/`.
- `js/main.js` is the only module with page-level side effects; it wires the document to
  the modules that do the work. Every other module exports functions or classes and does
  nothing on import.
- Group by feature (`js/orders/`), not by file kind.

## Asset delivery

- Pin third-party CSS/JS to an exact version from a CDN (jsDelivr), with a Subresource
  Integrity (`integrity`) hash and `crossorigin="anonymous"`. Never vendor a copy that can
  drift from the pinned version, and never use a floating tag such as `@5` or `@latest`.
- When bumping a version, recompute the hash from the exact file the tag points to:
  `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`, prefixed `sha384-`.
- Exception: a web font stylesheet whose response body varies by user agent (e.g. Google
  Fonts) cannot carry a fixed SRI hash -- do not add one; add `preconnect` hints to the
  font host(s) instead.

## Icons

- Use Bootstrap Icons (`<i class="bi bi-...">`) instead of inline `<svg>` markup. An inline
  SVG duplicates an icon the font already provides and drifts from it silently.
- Exception: a brand/wordmark mark with no icon-font equivalent may stay inline SVG.
- Mark decorative icons `aria-hidden="true"`. When an icon is the only content of a
  control, pair it with a `visually-hidden` text label.

## DOM and security

- Render untrusted or user-supplied text with `textContent` or `createTextNode`. Never
  assign it to `innerHTML`, `outerHTML` or `insertAdjacentHTML`, and never build markup by
  string concatenation. Use `replaceChildren` to swap content.
- Build elements with `document.createElement`, or clone a `<template>` element for
  repeated structure. Prefer event delegation on a stable ancestor over a listener per row.
- Never use `eval`, `new Function`, or inline event-handler attributes (`onclick=`).
- Talk to the back end with `fetch`, passed in as a dependency. Check `response.ok`; a
  failed call surfaces a user-visible message, never a silent catch.

## Navigation and accessibility

- Use a real `<a href>` for navigation and a real `<button type="button">` for actions.
  Never attach click handlers to a `<div>` or `<span>`.
- Every interactive control has an accessible name: visible text, `aria-label`, or a
  `visually-hidden` label -- never an icon alone.
- Dynamic status and error messages render in a live region (`role="status"` or
  `role="alert"`). Form inputs have an associated `<label>`.
- Use Bootstrap's components as documented (modal, collapse, dropdown) so their ARIA
  wiring and keyboard handling are kept; do not reimplement them.

## Testability

- Logic that touches the DOM takes the element or `document` as a parameter instead of
  reaching for the global, so a test can pass a detached element. Modules do not read
  `window` or `document` at import time.
- Tests that need a DOM start with `// @vitest-environment jsdom`; all others stay on the
  default Node environment.
- Interactive elements a test needs to target carry a `data-testid` attribute. For an
  element repeated per row, suffix the id with the row's identifier
  (`data-testid="save-${row.id}"`).
- Test through the exported function: assert what ended up in the DOM, not which internal
  helper ran.

## Styling

- Prefer Bootstrap's utility classes and components over new custom CSS. Project
  overrides go in one stylesheet, `css/app.css`, not inline `style` attributes.
- Use Bootstrap's theming hooks (CSS variables, `data-bs-theme`) instead of overriding
  component rules with higher specificity.
