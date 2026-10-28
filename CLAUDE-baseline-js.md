# JavaScript baseline conventions

Shared conventions for all farooq-teqniqly JavaScript projects. Source of truth:
[farooq-teqniqly/claude-templates](https://github.com/farooq-teqniqly/claude-templates).
Repos consume a copy of this file imported from their `CLAUDE.md`; update the template
first, then re-sync copies. Project-specific rules belong in the repo's own `CLAUDE.md`,
not here.

`multi-crop-app` is this repo's project prefix, substituted from the template's
double-braced PROJECT_NAME token when the baseline copy is synced.

## Language and spelling

- U.S. English in all prose, code comments, commit messages, PR descriptions, and docs
  ("color", "behavior", "organize", "canceled", "license" as a noun).
- No emojis in docs.
- Prefer hyphens or `--` over em dashes in new prose. Do not sweep existing docs to
  retrofit this preference.
- Never use em dashes or smart quotes inside PowerShell 5.1 string literals -- 5.1 reads
  UTF-8-without-BOM as Windows-1252, so they corrupt and break parsing. This is a hard
  rule, not a style preference.
- Never write a file with PowerShell 5.1's `-Encoding utf8` (`Set-Content`/`Out-File`) if
  a tool parses that file -- 5.1's `utf8` encoding always emits a byte-order mark, which
  breaks `JSON.parse` and trips linters and reviewers. Use `-Encoding utf8NoBOM` instead
  for source files, config, and any other file a tool reads.
- In any parameterized PowerShell script, `param()` must be the **very first statement** --
  a comment-based help block may precede it, but no executable statement may.

## Stack defaults

- Plain **vanilla JavaScript** -- no TypeScript, no JSX transpile step, no framework unless
  the project's own `CLAUDE.md` adds one. Type information goes in JSDoc.
- Target **Node 22 or above**; use the latest JavaScript features where they improve
  clarity. ES modules only (`"type": "module"` in `package.json`); no CommonJS.
- `package.json` declares `engines.node` (`>=22`) and a `.nvmrc` pins the major version CI
  uses. Commit `package-lock.json` and install in CI with `npm ci`, never `npm install`.
- Tests: **Vitest**. Coverage via `@vitest/coverage-v8`, LCOV output for SonarQube.
- Lint with **ESLint** (flat config, `eslint.config.js`) and format with **Prettier**.
  Formatting is not debated in review; the pre-commit hook enforces it.
- Version-controlled git hooks in `.githooks/`, activated via `core.hooksPath` (a
  `prepare` script in `package.json` sets it; fallback:
  `git config core.hooksPath .githooks`).
- `pre-push` runs the full test suite (`npm test`), not just the tests for the changed
  module -- a fix scoped to one module can silently break a test elsewhere (e.g. a mock
  keyed to an exact argument value that a change elsewhere no longer supplies), otherwise
  caught only by CI after a full review-loop round trip. Exception: a push whose commits
  touch nothing under `src/`, `tests/`, `.githooks/`, `.github/workflows/`,
  `.github/scripts/`, `scripts/`, or the root build/config files (`package.json`, `package-lock.json`,
  `.npmrc`, `.nvmrc`, `.editorconfig`, `vitest.config.*`, `eslint.config.*`,
  `.prettierrc*`, `.prettierignore`, `sonar-project.properties`) -- docs, OpenSpec
  artifacts, README, etc. -- skips the test run and prints why instead of paying the full
  suite's cost for a diff that cannot break a test.
- **GitHub Actions workflows and shell scripts are linted, and the linters are required
  tooling** -- [actionlint](https://github.com/rhysd/actionlint/releases) and
  [ShellCheck](https://github.com/koalaman/shellcheck/releases), both single binaries,
  unpacked anywhere on `PATH`. The `workflow-lint` CI job and the pre-commit hook both run
  them; the hook fails the commit when a staged workflow or shell file has no linter
  available, rather than skipping the check and deferring the failure to CI. Install them
  in a repo's README under "Required tooling". actionlint lints the `run:` blocks inside
  workflows **only when ShellCheck is also installed**, and says nothing when it is not --
  which is why neither is optional and the CI job asserts `shellcheck --version` before
  linting. Note when writing hooks: a shell comment whose first word is `shellcheck`
  parses as a lint directive and errors.
- **Never silence `npm audit` to get past an advisory** (no `--no-audit`, no blanket
  `audit-level` downgrade). Fix it: bump the vulnerable package, or, when it is
  transitive, pin the patched version with an `overrides` entry in `package.json`. Only
  when no patched version has shipped, document the accepted advisory (GHSA id, why, and
  what would let it be removed) in the PR that accepts it.
- Dependencies are pinned by the lockfile; add a dependency only when the platform
  (Node built-ins, Web APIs) has no reasonable equivalent.
- Line endings: LF everywhere except `.ps1/.bat/.cmd` (CRLF), governed by
  `.gitattributes` and mirrored in `.editorconfig`; keep the two aligned.

## Project layout

- Source under `src/`, grouped by feature or concern (e.g. `src/tokens/`), not by file
  kind.
- Each module's unit tests live under `tests/`, mirroring the `src/` path, with a
  `<module>.test.js` file name.
- A module's public surface is what it `export`s; anything not exported is private.
  Prefer an `index.js` barrel only at a feature boundary, not in every folder.

## Code conventions

- One primary export per file; file name matches it (kebab-case file names, e.g.
  `token-validator.js` exports `TokenValidator`). Prefer **named exports** over default
  exports so renames propagate and imports stay greppable.
- `const` by default, `let` only when reassigned, never `var`. Strict equality (`===`)
  only. Always use braces for control statements. Never negate the condition of an `if`
  that has an `else` -- put the positive case first.
- **Use `#private` fields and methods** for state that is not part of a class's public
  surface; do not use a `_underscore` convention. Prefer plain functions and object
  literals over classes when there is no state or identity to protect.
- **Validate at public entry points.** Every exported function or class constructor
  checks its required arguments before use and throws `TypeError` (wrong type or missing)
  or `RangeError` (out of range) with a message naming the parameter. Guards come first,
  in parameter order. Document each with a JSDoc `@throws` tag. Exception: internal
  helpers that are only reachable from already-validated callers -- trust the caller, no
  defensive checks.
- Dependencies (clients, loggers, clocks, `fetch`) are **passed in** (constructor or
  parameter), not imported as module-level singletons, so tests can substitute them.
  Remove any injected dependency that is not used in the file it is injected into.
- Async functions return promises and never mix callbacks. Cancellable operations accept
  an `AbortSignal` as the last option (`{ signal } = {}`) and pass it through to `fetch`
  and other signal-aware APIs. Use `async`/`await`; no unhandled promise -- every promise
  is awaited, returned, or explicitly handled (`no-floating-promises` equivalent).
- Errors: throw `Error` subclasses (set `cause` when wrapping), never strings or plain
  objects. Every `catch` block that suppresses or re-routes an exception (does not
  re-throw) must log at `warn` or above -- a silent catch hides failure paths.
- Log through an injected logger that emits structured fields (`logger.info('token
  issued', { subject })`), never bare `console.log` in `src/`.
- Immutable value objects: `Object.freeze` the instance (or use a class with only
  `#private` fields and getters) and expose an `equals` method when equality matters.
  Plain data carriers may be object literals or frozen objects with no validation.
- When comparing strings for equality in a case-insensitive way, normalize both sides the
  same way (`toLowerCase()` on identifiers/keys/protocol values; use `localeCompare` or
  `Intl.Collator` only for user-facing text meant to sort per locale). Use the same
  normalization when computing a `Map` key or hash as when comparing.
- Prefer destructuring, optional chaining (`?.`), nullish coalescing (`??`), and
  `switch`/lookup tables over boolean chains. Prefer `Array` iteration methods
  (`map`/`filter`/`flatMap`/`toSorted`) over index loops when it reads more clearly.
- Keep cyclomatic complexity of any function at **15 or below**; extract helpers.
  Keep parameter counts at **7 or below**; when a signature would exceed this, take a
  single options object that reflects a genuine domain concept.
- No comments that restate what the code already says. Comment only the non-obvious:
  why a choice was made, a workaround, a framework quirk, a subtle invariant.
- Naming: `PascalCase` classes, `camelCase` functions/variables/properties,
  `UPPER_SNAKE_CASE` for module-level constants that are truly constant, `kebab-case`
  file names, `isX`/`hasX` for booleans, no Hungarian notation, no abbreviations in
  exported names. Async functions that return a promise need no special suffix.

## Documentation

- **JSDoc on every exported function, class, and method**: at minimum a description, plus
  `@param`, `@returns`, and `@throws` where they add information beyond the signature.
  Complete sentences ending with a period; describe behavior or contract, never restate
  the identifier name. Types go in JSDoc (`@param {string} issuer`), since the project is
  not TypeScript.
- Use `@typedef` for shared object shapes instead of re-describing them inline.
- Non-exported helpers are covered by convention. Test files are exempt -- test names
  document intent.
- The README carries a "Required tooling" section (Node version, actionlint, ShellCheck).

## Testing

- **TDD for production behavior:** red-green-refactor. Write a failing test first and run
  it to confirm it fails for the right reason, write the minimum code to pass, then
  refactor green. Non-behavioral edits (docs, formatting, signature tweaks) need no new
  test. For test-only changes against complete production code, satisfy failing-first with
  a `expect.fail('not implemented')` placeholder, confirm red, then write real assertions.
- One test file per production module (`tests/<path>/<module>.test.js`), one top-level
  `describe` per exported subject.
- Test names read `Scenario_ExpectedResult` inside a `describe(<Subject>)`, e.g.
  `describe('TokenValidator.validate')` containing
  `it('ExpiredToken_ReturnsExpiredOutcome')`. The Subject names the observable exported
  entry point -- not a private helper, even when the test reaches the helper through that
  entry point.
- Every test has `// Arrange`, `// Act`, `// Assert` comments. When phases collapse into a
  single expression (e.g. `expect(() => fn()).toThrow()`), combine markers
  (`// Act / Assert`) on one line. Never annotate a marker with an explanation, on the
  same line or the next.
- No section-divider comments inside test files -- if a divider seems necessary, the test
  names are not descriptive enough.
- Prefer `it.each` / `describe.each` over near-duplicate `it` blocks. The moment a second
  `it` would test the same function with different inputs, write a table.
- **Test behavior, not implementation** -- assert observable outcomes (return values,
  thrown errors, emitted output), not internal calls. Reach for `vi.fn()` call assertions
  only at a boundary the behavior is defined by (an outbound HTTP request, a logger).
- No trivially-true assertions: do not assert a value a query predicate already
  guarantees, and do not assert claims guaranteed by construction rather than by the
  behavior under test.
- Coverage obligations: every argument-validation guard on an exported function gets at
  least one test of the wrong-type/missing/out-of-range input; every `catch` block that
  suppresses or transforms an exception gets at least one test exercising that path; when a
  function returns one of several named outcome shapes, enumerate all of them first and
  give each at least one dedicated test.
- Do not test non-exported helpers directly -- cover them through their exported callers.
  If a helper is unreachable through any exported surface, that is a design signal.
- Never depend on wall-clock time, randomness, or the network in a unit test: inject a
  clock/RNG/`fetch` and use `vi.useFakeTimers()` where time must pass. Restore mocks
  after each test (`restoreMocks: true` in `vitest.config.js`).
- Resources a test opens (servers, timers, file handles) are closed in `afterEach` /
  `afterAll`, so the run exits cleanly without `--forceExit`.

## Configuration and secrets

- Secrets (API keys, signing keys, tokens) are **never** committed or placed in
  `package.json`, source, or checked-in config. Local development reads them from a
  git-ignored `.env` file (`node --env-file=.env`); deployed environments use the
  platform's secret store.
- Commit a `.env.example` listing every variable with a placeholder value.
- Endpoint and tuning overrides go in config files or environment variables with sensible
  defaults in code.
- Read `process.env` in one place (a config module) and pass values in; do not sprinkle
  `process.env` reads through the code.

## Commits and pull requests

- **Conventional Commits**, enforced by the `.githooks/commit-msg` hook:
  `<type>(<scope>)!: <description>` where scope and `!` are optional and scope matches
  `[a-z0-9._-]+`. Types: `feat fix docs style refactor perf test build ci chore revert`.
- Body (optional): wrap at 72 characters, explain _why_ not _what_.
- Do not skip hooks (`--no-verify`) unless explicitly asked.
- AI-assisted commits carry a `Co-Authored-By: Claude <model name> <noreply@anthropic.com>`
  trailer naming the model actually in use -- never hardcode a model name in docs or
  templates.
- **After finishing a batch of work (e.g. an OpenSpec `tasks.md` batch), stop and wait for
  explicit approval before committing.** Green tests are not approval. This does not apply
  when the user's own message for that turn asks for a commit ("commit and do X") -- that
  request is itself the approval.
- PR descriptions: **under 200 words** -- what changed, why, and a short test/verification
  note. No filler phrases ("this PR...", "in this change...").
- **Always squash merge**: `gh pr merge <n> --squash`, never a merge commit or rebase, even
  when the repo allows all three. `main` stays one commit per PR, so its history reads as a
  list of shipped changes and any single entry can be reverted whole.
- Pass the squash subject explicitly (`--subject`) rather than accepting whatever GitHub
  composes from the branch's commits: the PR's conventional-commit title with the number
  appended, e.g. `feat(web): add review queue UI (#22)`. The body says what shipped and
  why, and carries the `Co-Authored-By` trailer.
- A squash-merged branch reads as **unmerged** to `git branch --merged`, because its
  commits never land on `main`. Before deleting one, confirm the content actually shipped
  with `git diff --stat main <branch>` (empty output). Do not trust `-d` to refuse: it will
  refuse a perfectly merged branch here, and `-D` alone proves nothing.

## Optional modules

Compose these from the template repo when they fit the project:

- `CLAUDE-domain-driven-design.md` -- domain modeling principles (value objects, state
  types over enums, outcomes as types).
- `CLAUDE-vanilla-js-ui.md` -- browser front-end conventions: no framework, no bundler,
  Bootstrap from a pinned CDN, DOM-safe rendering, testability, accessibility.
