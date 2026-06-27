# Structural QS

React app for uploading structural drawings, converting pages to images, asking AI for a BBS-style quantity survey, and displaying the calculated concrete and steel summary.

## File Structure

- `src/App.jsx` - main app state, upload workflow, batching, and result orchestration
- `src/components/` - reusable UI sections such as upload, logs, summary cards, tables, and member cards
- `src/constants/` - steel constants and the long structural AI prompt
- `src/services/` - external work such as AI analysis and PDF page conversion
- `src/utils/` - file conversion and summary recalculation helpers
- `src/styles/` - shared CSS and small JS style helpers

## Run

```bash
npm install
npm run dev
```
