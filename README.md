# multi-crop-app

A local, single-user web app for cropping several regions out of one image in one pass.

## Required tooling

- Node 22 or above (see `.nvmrc`).
- [actionlint](https://github.com/rhysd/actionlint/releases) and
  [ShellCheck](https://github.com/koalaman/shellcheck/releases): single binaries, unpacked
  anywhere on `PATH`. The pre-commit hook and CI lint workflows and shell scripts with them.
  actionlint lints workflow `run:` blocks only when ShellCheck is also installed.

## Getting started

```
npm install     # also activates .githooks via the prepare script
npm run dev     # serve the app
npm test        # unit tests
npm run build   # static bundle in dist/
```

The app uses the File System Access API, so it needs a Chromium-based browser.
