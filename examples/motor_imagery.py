"""End-to-end motor-imagery decoding example.

Follows the braindecode pipeline: load dataset -> preprocess -> window ->
train an ``EEGClassifier``. Mirrors the tutorials at
https://braindecode.org/stable/auto_examples/index.html.

Requires the ``datasets`` extra (MOABB):

    pip install -e ".[datasets]"

Run:

    python examples/motor_imagery.py
"""

from __future__ import annotations

from braindecode.datasets import MOABBDataset
from braindecode.preprocessing import (
    Preprocessor,
    create_windows_from_events,
    preprocess,
)

from brainwerks.models import build_classifier

# --- Configuration -------------------------------------------------------
SUBJECT_ID = 3
LOW_CUT_HZ = 4.0
HIGH_CUT_HZ = 38.0
TRIAL_START_OFFSET_SECONDS = -0.5


def main() -> None:
    # 1. Load a public motor-imagery dataset via MOABB.
    dataset = MOABBDataset(dataset_name="BNCI2014_001", subject_ids=[SUBJECT_ID])

    # 2. Preprocess: pick EEG channels, convert to microvolts, and band-pass.
    preprocessors = [
        Preprocessor("pick_types", eeg=True, meg=False, stim=False),
        Preprocessor(lambda data: data * 1e6),  # V -> uV
        Preprocessor("filter", l_freq=LOW_CUT_HZ, h_freq=HIGH_CUT_HZ),
    ]
    preprocess(dataset, preprocessors)

    # 3. Cut continuous recordings into supervised trial windows.
    sfreq = dataset.datasets[0].raw.info["sfreq"]
    trial_start_offset_samples = int(TRIAL_START_OFFSET_SECONDS * sfreq)
    windows = create_windows_from_events(
        dataset,
        trial_start_offset_samples=trial_start_offset_samples,
        trial_stop_offset_samples=0,
        preload=True,
    )

    # 4. Split by the dataset's predefined session column.
    splits = windows.split("session")
    train_set = splits["0train"]
    valid_set = splits["1test"]

    n_channels = train_set[0][0].shape[0]
    input_window_samples = train_set[0][0].shape[1]
    n_classes = len(set(y for _, y, _ in train_set))

    # 5. Build and train the classifier.
    clf = build_classifier(
        "shallow",
        n_channels=n_channels,
        n_classes=n_classes,
        input_window_samples=input_window_samples,
        max_epochs=50,
    )
    clf.fit(train_set, y=None)

    # 6. Evaluate on the held-out session.
    accuracy = clf.score(valid_set, y=[y for _, y, _ in valid_set])
    print(f"Validation accuracy: {accuracy:.3f}")


if __name__ == "__main__":
    main()
