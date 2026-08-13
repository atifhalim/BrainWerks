# Deck source — "Brain Waves & AI" tutorials

Scripts that generate the tutorial slide decks. Edit these and rebuild to change
the presentations.

- `build.js` → `../Brain-Waves-and-AI-Tutorial-1.pptx` (Tutorial #1, 25 slides).
- `build2.js` → `../Brain-Waves-and-AI-Tutorial-2.pptx` (Tutorial #2, 9 slides:
  the math behind the BCI IV 2a data shape `576 × 22 × 1125 · 250 Hz · 4.5 s`,
  written for a 14-year-old).

## Files

| File | What it does |
|------|--------------|
| `assets.js` | Generates icon badges, gradient backgrounds, and EEG-waveform PNGs into `assets/`. |
| `assets2.js` | Generates the "movie-frames" sampling illustration (`assets/sampling.png`). |
| `build.js` | Builds Tutorial #1's `.pptx` using [pptxgenjs](https://gitbrent.github.io/PptxGenJS/) and the generated assets. |
| `build2.js` | Builds Tutorial #2's `.pptx` (reuses the same palette, helpers, and assets). |
| `package.json` | Dependency list and build scripts. |

## Build

Requires Node.js 18+.

```bash
cd learning/deck-src
npm install
npm run build        # Tutorial #1 → writes BrainWaves_and_AI.pptx
npm run build2       # Tutorial #2 → writes BrainWaves_Tutorial2.pptx
```

Then copy the result over the committed deck if you want to update it:

```bash
cp BrainWaves_and_AI.pptx  "../Brain-Waves-and-AI-Tutorial-1.pptx"
cp BrainWaves_Tutorial2.pptx "../Brain-Waves-and-AI-Tutorial-2.pptx"
```

`npm run assets` regenerates only the images; `npm run deck` / `npm run deck2`
rebuild only the slides (assumes `assets/` already exists).

## Notes

- `node_modules/`, the generated `assets/`, and build outputs are git-ignored;
  only the source scripts are tracked.
- Colors, fonts, and layout constants live at the top of `build.js`.
- Slide content is authored as one self-contained IIFE per slide, in order.
- The design intentionally uses only widely available fonts (Cambria for
  headings, Calibri for body, Courier New for code/tables).
