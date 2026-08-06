"""Smoke tests for the model factory.

These avoid downloading any data: they only check that classifiers are
constructed with the expected wiring. They are skipped cleanly if braindecode
(and its heavy deps) are not installed in the current environment.
"""

import pytest

pytest.importorskip("braindecode")

from brainwerks.models import MODELS, build_classifier  # noqa: E402


@pytest.mark.parametrize("model", sorted(MODELS))
def test_build_classifier_constructs(model):
    clf = build_classifier(
        model,
        n_channels=22,
        n_classes=4,
        input_window_samples=1000,
        device="cpu",
    )
    assert clf.module is MODELS[model]
    assert clf.device == "cpu"


def test_unknown_model_raises():
    with pytest.raises(ValueError):
        build_classifier(
            "does-not-exist",
            n_channels=22,
            n_classes=4,
            input_window_samples=1000,
        )
