# Learning materials

Beginner-friendly resources for understanding this project.

## Brain Waves & AI — Tutorial 1 (`Brain-Waves-and-AI-Tutorial-1.pptx`)

A 25-slide presentation that teaches braindecode's first tutorial
([Simple training on MNE epochs](https://braindecode.org/stable/auto_examples/model_building/plot_basic_training_epochs.html))
from the ground up — written for a complete beginner with no background in
neuroscience or AI.

It covers:

- **What brain waves are** — neurons, electricity, and the EEG wave bands.
- **How EEG is recorded** — electrodes, channels, and what the raw data looks like
  (shown as an actual table of numbers).
- **The core vocabulary** — channels, time, trials, classes, and epochs.
- **Sampling & time** — a "movie-frames" illustration of samples and hertz (Hz),
  including `clip length = samples ÷ Hz` and why more Hz does *not* mean a longer clip.
- **How a clip gets labeled** — event markers/triggers and keeping the timing aligned.
- **The full data pipeline** — get data → make epochs → prepare → train → score,
  step by step, and *why* each preparation step is needed.
- **Training & accuracy** — how the model learns and how accuracy is measured on
  unseen validation data (including the two different meanings of "epoch").
- **Why a chance-level score on random data is the correct result**, and how the
  same pipeline performs on real motor-imagery EEG.

Speaker notes are included on every slide, plus links to vetted beginner
YouTube videos and to the braindecode / MNE / PyTorch documentation.

> Best viewed in PowerPoint or Google Slides (it uses tables, notes, and
> clickable links).
