# Deck source — "Brain Waves & AI — Tutorial 1"

Scripts that generate `../Brain-Waves-and-AI-Tutorial-1.pptx`. Edit these and
rebuild to change the presentation.

## Files

| File | What it does |
|------|--------------|
| `assets.js` | Generates icon badges, gradient backgrounds, and EEG-waveform PNGs into `assets/`. |
| `assets2.js` | Generates the "movie-frames" sampling illustration (`assets/sampling.png`). |
| `build.js` | Builds the full 25-slide `.pptx` using [pptxgenjs](https://gitbrent.github.io/PptxGenJS/) and the generated assets. |
| `package.json` | Dependency list and build scripts. |

## Build

Requires Node.js 18+.

```bash
cd learning/deck-src
npm install
npm run build        # generates assets/ then writes BrainWaves_and_AI.pptx
```

Then copy the result over the committed deck if you want to update it:

```bash
cp BrainWaves_and_AI.pptx "../Brain-Waves-and-AI-Tutorial-1.pptx"
```

`npm run assets` regenerates only the images; `npm run deck` rebuilds only the
slides (assumes `assets/` already exists).

## Notes

- `node_modules/`, the generated `assets/`, and build outputs are git-ignored;
  only the source scripts are tracked.
- Colors, fonts, and layout constants live at the top of `build.js`.
- Slide content is authored as one self-contained IIFE per slide, in order.
- The design intentionally uses only widely available fonts (Cambria for
  headings, Calibri for body, Courier New for code/tables).
