## 1. Filename logic

- [x] 1.1 Add `normalizeCropName` and `resolveCropFilename` to `crop-filename.js` with tests
- [x] 1.2 Add `name` and `store.rename` to the crop store with tests

## 2. Crop list

- [x] 2.1 Render the filename as an input with a full-filename tooltip
- [x] 2.2 Select the base name on focus and click
- [x] 2.3 Commit on Enter or blur, revert on Escape, reject empty and duplicate names via `onRejected`

## 3. Export and wiring

- [x] 3.1 Export with the edited name
- [x] 3.2 Wire `onRejected` to the crop warning in `main.js`
- [ ] 3.3 Manual browser verification
