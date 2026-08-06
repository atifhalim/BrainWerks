"""Simple training on MNE epochs (braindecode's first tutorial).

A "hello world" for brain-signal decoding. It uses **randomly generated**
data (no download required), so the focus is on the workflow rather than a
real dataset:

    random signal -> wrap as MNE epochs -> pick a model -> EEGClassifier.fit()

Because the data is pure noise, accuracy stays near chance (~1/n_classes) --
that is the expected, correct result. On real EEG the same code learns.

Reference:
https://braindecode.org/stable/auto_examples/model_building/plot_basic_training_epochs.html

Run:

    pip install -e ".[dev]"   # installs braindecode + torch
    python examples/simple_epochs.py
"""

from __future__ import annotations

import mne
import numpy as np
import torch
from skorch.dataset import ValidSplit

from braindecode import EEGClassifier
from braindecode.util import set_random_seeds

# --- Configuration -------------------------------------------------------
SEED = 20240205
N_TRIALS = 100
CH_NAMES = ["C3", "C4", "Cz"]  # electrodes over the motor cortex
SFREQ = 256.0  # samples per second
N_TIMES = 1024  # 1024 / 256 Hz = 4 seconds per trial
N_CLASSES = 4


def main() -> None:
    # 1. Pin all randomness so runs are reproducible.
    cuda = torch.cuda.is_available()
    set_random_seeds(seed=SEED, cuda=cuda)

    # 2. Build synthetic EEG shaped (trials, channels, time) and wrap it as
    #    MNE epochs -- the standard container for equal-length signal slices.
    info = mne.create_info(ch_names=CH_NAMES, sfreq=SFREQ, ch_types="eeg")
    signal = np.random.randn(N_TRIALS, len(CH_NAMES), N_TIMES).astype("float32")
    epochs = mne.EpochsArray(signal, info=info)
    labels = np.random.randint(0, N_CLASSES, size=N_TRIALS)

    # 3. Wrap a braindecode model in the scikit-learn-style EEGClassifier.
    #    n_chans / n_times / n_outputs are inferred from the epochs at fit time.
    #    ValidSplit(0.2) holds back 20% of trials to report validation metrics.
    net = EEGClassifier(
        "ShallowFBCSPNet",
        module__final_conv_length="auto",
        train_split=ValidSplit(0.2),
        device="cuda" if cuda else "cpu",
    )

    # 4. Train. This prints a per-epoch table (loss + validation accuracy).
    net.fit(epochs, y=labels)

    # 5. Inspect the trained model's inferred properties.
    module = net.module_
    print("\nTrained model properties (inferred from the data):")
    print(f"  n_chans   = {module.n_chans}")
    print(f"  n_times   = {module.n_times}")
    print(f"  n_outputs = {module.n_outputs}")
    print(
        "\nValidation accuracy stays near chance "
        f"(~{1 / N_CLASSES:.2f}) because the data is random noise -- expected."
    )


if __name__ == "__main__":
    main()
