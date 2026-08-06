# BrainWerks

Deep learning on brain signals (EEG / MEG / ECoG), built on
[**braindecode**](https://braindecode.org/stable/index.html) — a PyTorch-native
toolbox for end-to-end neural decoding.

Braindecode provides 65+ model architectures, 20+ EEG data augmentations, and
access to 150+ datasets (via [MOABB](https://moabb.neurotechx.com/)) plus 700+
BIDS datasets. BrainWerks wraps a small, opinionated slice of it so experiments
stay short and reproducible.

## Requirements

- Python **3.11+**
- PyTorch 2.0+ (a CUDA-enabled build is recommended for training)

## Installation

```bash
# Create and activate a virtual environment
python -m venv .venv && source .venv/bin/activate

# Install BrainWerks with public-dataset and dev extras
pip install -e ".[datasets,dev]"
```

The core dependencies (braindecode, torch, mne, skorch, scikit-learn) are also
listed in `requirements.txt` for a plain `pip install -r requirements.txt`.

## Project layout

```
brainwerks/
├── src/brainwerks/       # library code
│   ├── __init__.py
│   └── models.py         # build_classifier(): braindecode model factory
├── examples/
│   └── motor_imagery.py  # end-to-end motor-imagery decoding pipeline
├── tests/                # smoke tests (no data download)
├── data/                 # local datasets (git-ignored)
├── pyproject.toml
└── requirements.txt
```

## Quick start

Build an `EEGClassifier` around a braindecode architecture:

```python
from brainwerks.models import build_classifier

clf = build_classifier(
    "shallow",               # "shallow" | "deep4" | "eegnet"
    n_channels=22,
    n_classes=4,
    input_window_samples=1000,
    max_epochs=50,
)
clf.fit(train_windows, y=None)   # braindecode WindowsDataset
```

Run the full pipeline on a public motor-imagery dataset (downloads data via
MOABB on first run):

```bash
python examples/motor_imagery.py
```

## Testing

```bash
pytest
```

## References

- Braindecode documentation: <https://braindecode.org/stable/index.html>
- Tutorials & examples: <https://braindecode.org/stable/auto_examples/index.html>
- MOABB datasets: <https://moabb.neurotechx.com/>

## License

MIT
