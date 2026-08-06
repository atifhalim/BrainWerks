"""Model construction helpers built on braindecode.

Braindecode ships 65+ architectures (see
https://braindecode.org/stable/api.html#models). This module wraps a small,
opinionated selection behind a single factory so experiment code stays terse.
"""

from __future__ import annotations

import torch

from braindecode.classifier import EEGClassifier
from braindecode.models import Deep4Net, EEGNetv4, ShallowFBCSPNet

# Registry of the architectures we expose by default. Extend as needed.
MODELS = {
    "shallow": ShallowFBCSPNet,
    "deep4": Deep4Net,
    "eegnet": EEGNetv4,
}


def build_classifier(
    model: str = "shallow",
    *,
    n_channels: int,
    n_classes: int,
    input_window_samples: int,
    lr: float = 6.25e-4,
    weight_decay: float = 0.0,
    max_epochs: int = 100,
    batch_size: int = 64,
    device: str | None = None,
) -> EEGClassifier:
    """Build a skorch-based :class:`EEGClassifier` around a braindecode model.

    Parameters
    ----------
    model:
        Key into :data:`MODELS` (``"shallow"``, ``"deep4"`` or ``"eegnet"``).
    n_channels:
        Number of EEG channels (electrodes) in the input.
    n_classes:
        Number of target classes.
    input_window_samples:
        Number of time samples per trial/window fed to the network.
    device:
        Torch device string. Defaults to ``"cuda"`` when available, else ``"cpu"``.

    Returns
    -------
    EEGClassifier
        An unfitted, scikit-learn-compatible classifier. Call ``.fit(X, y)``.
    """
    if model not in MODELS:
        raise ValueError(f"Unknown model {model!r}; choose from {sorted(MODELS)}")

    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    module = MODELS[model]

    clf = EEGClassifier(
        module=module,
        module__n_chans=n_channels,
        module__n_outputs=n_classes,
        module__n_times=input_window_samples,
        criterion=torch.nn.CrossEntropyLoss,
        optimizer=torch.optim.AdamW,
        optimizer__lr=lr,
        optimizer__weight_decay=weight_decay,
        train_split=None,  # let the caller manage validation splits
        max_epochs=max_epochs,
        batch_size=batch_size,
        device=device,
    )
    return clf
