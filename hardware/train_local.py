#!/usr/bin/env python3
"""
train_local.py — train a braindecode model locally (Jetson or any computer).

Data sources:
  --source synthetic  Fake EEG-shaped data. Instant, no download, no network.
  --source alpha      Real EEG: eyes open vs closed (PhysioNet EEGBCI, via MNE).
  --source motor      Real EEG: imagine left vs right hand (EEGBCI). "eegbci" is
                      kept as an alias for this.
  --source bcic2a     BCI Competition IV 2a: 4-class motor imagery, 22 channels
                      (MOABB 'BNCI2014_001'). Needs `moabb` installed.
  --source npz PATH   Your own recording saved by ironbci32_stream.py.

Only needs: braindecode, mne, scikit-learn (which pull in torch + skorch).
Uses the GPU automatically if PyTorch sees CUDA; otherwise CPU (fine for these).

This file is ALSO a library: hardware/webapp/server.py imports get_data(),
make_model() and train_model() from here, so the CLI and the web app run the
exact same code.

Examples
--------
  python3 train_local.py --source synthetic --model shallow --epochs 20
  python3 train_local.py --source eegbci --model shallow --epochs 25
  python3 train_local.py --source npz session1.npz --model eegnet --epochs 40
"""
import argparse
import numpy as np
import mne
import torch
from braindecode.models import ShallowFBCSPNet, Deep4Net
try:                                         # braindecode >= 1.0
    from braindecode.models import EEGNet
except ImportError:                          # braindecode < 1.0 called it EEGNetv4
    from braindecode.models import EEGNetv4 as EEGNet
try:
    from braindecode import EEGClassifier
except ImportError:
    from braindecode.classifier import EEGClassifier
from braindecode.util import set_random_seeds
from skorch.dataset import ValidSplit
from sklearn.model_selection import train_test_split

mne.set_log_level("ERROR")
MODELS = {"shallow": ShallowFBCSPNet, "deep": Deep4Net, "eegnet": EEGNet}


# --------------------------------------------------------------------------- #
# Data loaders — each returns (X, y, class_names, sfreq, ch_names)
#   X        : float32 array (trials, channels, time)   in microvolts
#   y        : int64   array (trials,)                  class index per trial
#   ch_names : the channel (electrode) name of each row of X
#
# The three datasets and their editable knobs mirror Tutorial #1's Colab
# notebook exactly: synthetic lets you set everything; the two real datasets let
# you choose how many channels and the clip length, while their number of
# classes and sampling rate are fixed by the recording.
# --------------------------------------------------------------------------- #
EEGBCI_SUBJECT = 1
# Preferred channels per real task, in priority order (only those actually in
# the recording are used, first N as requested) — same pools as the Colab.
ALPHA_POOL = ["O1", "Oz", "O2", "P3", "Pz", "P4", "POz",
              "PO3", "PO4", "P1", "P2", "P7", "P8"]     # occipital → alpha
MOTOR_POOL = ["C3", "Cz", "C4", "C1", "C2", "CP3", "CP4",
              "FC3", "FC4", "C5", "C6", "CP1", "CP2"]   # motor cortex


def load_synthetic(trials=100, channels=3, n_times=1024, classes=4, seed=0,
                   pattern=True):
    """Synthetic EEG-shaped data at 250 Hz (4 ms per sample), like the deck.
    Two flavors, chosen by `pattern`:

      pattern=True  (default): random noise + a per-class sine bump, so each
          class carries a distinct rhythm a model can learn — it scores well
          above chance with no download. Good for verifying the pipeline runs
          (CLI, two-box smoke test).
      pattern=False: pure random noise with RANDOM labels — there is NO pattern,
          so accuracy should stay near chance. This is what Tutorial #1 (the
          slides and the Colab notebook) teaches: random data → no learning.

    Every knob here is adjustable in the web app."""
    rng = np.random.default_rng(seed)
    sfreq = 250.0                                 # 250 Hz → 4 ms per sample
    names = [f"class {i}" for i in range(classes)]
    ch_names = [f"ch{i+1}" for i in range(channels)]
    if not pattern:
        # Colab semantics: labels are independent of the signal, so nothing to
        # learn. ~8 µV of noise, like the notebook's synthetic source.
        X = (rng.standard_normal((trials, channels, n_times)) * 8.0).astype("float32")
        y = rng.integers(0, classes, trials).astype("int64")
        return X, y, names, sfreq, ch_names
    t = np.arange(n_times) / sfreq
    y = np.tile(np.arange(classes), trials // classes + 1)[:trials].astype("int64")
    rng.shuffle(y)
    X = (rng.standard_normal((trials, channels, n_times)) * 5.0).astype("float32")
    for i, c in enumerate(y):                 # each class gets its own rhythm
        freq = 6.0 + 2.0 * c                  # 6, 8, 10, 12 … Hz
        X[i] += (12.0 * np.sin(2 * np.pi * freq * t)).astype("float32")
    return X, y, names, sfreq, ch_names


def _eegbci_run(run):
    """Load one PhysioNet EEGBCI run for subject 1, channel names standardized."""
    fn = mne.datasets.eegbci.load_data(EEGBCI_SUBJECT, [run], update_path=True)
    r = mne.io.read_raw_edf(fn[0], preload=True)
    mne.datasets.eegbci.standardize(r)
    return r


def _pick_channels(pool, available, channels):
    """First `channels` of the preferred pool that actually exist in the data."""
    present = [c for c in pool if c in available]
    return present[:max(1, int(channels))]


def load_alpha(channels=6, clip=2.0):
    """Real EEG — eyes OPEN (run 1) vs CLOSED (run 2). Alpha waves grow when the
    eyes close, over the occipital channels. Classes and sampling rate are fixed;
    you choose how many channels and the clip length."""
    runs = [(1, 0), (2, 1)]                        # (run, label): open=0, closed=1
    loaded = [(lab, _eegbci_run(run)) for run, lab in runs]
    sfreq = float(loaded[0][1].info["sfreq"])
    ch = _pick_channels(ALPHA_POOL, loaded[0][1].ch_names, channels)
    n = int(clip * sfreq)
    X, y = [], []
    for lab, r in loaded:                          # cut each recording into clips
        d = r.copy().pick(ch).get_data() * 1e6     # volts → µV
        for i in range(d.shape[1] // n):
            X.append(d[:, i * n:(i + 1) * n])
            y.append(lab)
    return (np.stack(X).astype("float32"), np.array(y, "int64"),
            ["eyes open", "eyes closed"], sfreq, list(ch))


def load_motor(channels=3, clip=2.0):
    """Real EEG — imagine moving the LEFT vs RIGHT hand (motor cortex). Classes
    and sampling rate are fixed; you choose how many channels and the clip
    length. The hardest task here."""
    raw = mne.concatenate_raws([_eegbci_run(r) for r in (4, 8, 12)])
    sfreq = float(raw.info["sfreq"])
    ch = _pick_channels(MOTOR_POOL, raw.ch_names, channels)
    raw.pick(ch)
    events, eid = mne.events_from_annotations(raw)
    ep = mne.Epochs(raw, events, {k: eid[k] for k in ("T1", "T2")},
                    tmin=0.0, tmax=clip - 1 / sfreq, baseline=None, preload=True)
    X = (ep.get_data() * 1e6).astype("float32")
    y = (ep.events[:, -1] == eid["T2"]).astype("int64")
    return X, y, ["left hand", "right hand"], sfreq, list(ch)


def load_bcic2a(subject=3):
    """BCI Competition IV 2a — MOABB 'BNCI2014_001'. 4-class motor imagery
    (left hand, right hand, feet, tongue), 22 EEG channels @ 250 Hz, one subject
    (1-9). Mirrors braindecode's 'plot_bcic_iv_2a_moabb_trial' pipeline:

      pick EEG → V to µV → band-pass 4-38 Hz → exponential moving
      standardization → cut trial windows (start 0.5 s before the cue).

    Returns every trial from both of the subject's sessions (the train/test
    split by session happens at training time). Needs `moabb` installed
    (pip install moabb) so braindecode can download and parse the recordings."""
    from braindecode.datasets import MOABBDataset
    from braindecode.preprocessing import (
        Preprocessor, preprocess, exponential_moving_standardize,
        create_windows_from_events)

    subject = int(subject)
    factor = 1e6                                     # volts → microvolts
    dataset = MOABBDataset(dataset_name="BNCI2014_001", subject_ids=[subject])
    preprocess(dataset, [
        Preprocessor("pick_types", eeg=True, meg=False, stim=False),
        Preprocessor(lambda data: np.multiply(data, factor)),
        Preprocessor("filter", l_freq=4.0, h_freq=38.0),
        Preprocessor(exponential_moving_standardize,
                     factor_new=1e-3, init_block_size=1000),
    ])
    sfreq = float(dataset.datasets[0].raw.info["sfreq"])
    # Channel names come from the preprocessed raw (22 EEG channels) — windowing
    # keeps channels, and this is stable across braindecode versions.
    ch_names = list(dataset.datasets[0].raw.ch_names)
    trial_start_offset_samples = int(-0.5 * sfreq)   # 0.5 s before the cue
    windows = create_windows_from_events(
        dataset, trial_start_offset_samples=trial_start_offset_samples,
        trial_stop_offset_samples=0, preload=True)
    X = np.stack([w[0] for w in windows]).astype("float32")
    y = np.array([int(w[1]) for w in windows], dtype="int64")
    classes = ["left hand", "right hand", "feet", "tongue"]
    return X, y, classes, sfreq, ch_names


def load_npz(path):
    d = np.load(path, allow_pickle=True)
    X = d["X"].astype("float32")
    sfreq = float(d["sfreq"]) if "sfreq" in d else 0.0
    ch_names = list(d["ch_names"]) if "ch_names" in d else \
        [f"ch{i+1}" for i in range(X.shape[1])]
    return X, d["y"].astype("int64"), list(d["classes"]), sfreq, ch_names


def get_data(source, **params):
    """Dispatch to a loader by name. Extra params are passed through.
    Returns (X, y, class_names, sfreq, ch_names)."""
    if source == "synthetic":
        return load_synthetic(**params)
    if source == "alpha":
        return load_alpha(**params)
    if source in ("motor", "eegbci"):    # "eegbci" kept as an alias for motor
        return load_motor(**params)
    if source == "bcic2a":
        return load_bcic2a(**params)
    if source == "npz":
        return load_npz(params["path"])
    raise ValueError(f"unknown source: {source}")


# --------------------------------------------------------------------------- #
# Model + training
# --------------------------------------------------------------------------- #
def make_model(name, n_chans, n_times, n_classes):
    Model = MODELS[name]
    extra = {"final_conv_length": "auto"} if name in ("shallow", "deep") else {}
    try:                                     # braindecode >= 0.8 naming
        return Model(n_chans=n_chans, n_outputs=n_classes, n_times=n_times, **extra)
    except TypeError:                        # older braindecode naming
        return Model(in_chans=n_chans, n_classes=n_classes,
                     input_window_samples=n_times, **extra)


def resolve_device(choice="auto"):
    if choice == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    return choice


def _fit_once(Xtr, ytr, Xte, yte, classes, model, epochs, lr, batch, device, seed):
    set_random_seeds(seed, cuda=(device == "cuda"))
    n_cls, C, T = len(classes), int(Xtr.shape[1]), int(Xtr.shape[2])
    if device == "cuda":
        torch.backends.cudnn.benchmark = True   # fixed input size -> faster kernels
        torch.cuda.empty_cache()
    clf = EEGClassifier(make_model(model, C, T, n_cls),
                        criterion=torch.nn.CrossEntropyLoss,
                        optimizer=torch.optim.Adam, optimizer__lr=lr,
                        batch_size=batch, max_epochs=epochs,
                        iterator_train__drop_last=False,   # train even on small sets
                        train_split=ValidSplit(0.2), device=device, verbose=1)
    clf.fit(Xtr, ytr)
    acc = float(clf.score(Xte, yte))
    train_loss = [float(r["train_loss"]) for r in clf.history if "train_loss" in r]
    return acc, train_loss


def train_model(X, y, classes, model="shallow", epochs=25, lr=6.25e-4,
                batch=16, device="auto", seed=20240205):
    """Train and evaluate. Returns a JSON-friendly dict.

    Resource-optimized for the Xavier NX's shared CPU/GPU memory: 'auto' runs on
    the GPU when one is present, and if the GPU runs out of the shared memory it
    transparently falls back to the CPU for that run instead of crashing. You get
    GPU speed whenever it fits, with no manual constraint."""
    device = resolve_device(device)
    n_cls, C, T = len(classes), int(X.shape[1]), int(X.shape[2])
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25,
                                          random_state=1, stratify=y)
    note = ""
    try:
        acc, train_loss = _fit_once(Xtr, ytr, Xte, yte, classes, model,
                                    epochs, lr, batch, device, seed)
    except RuntimeError as e:                    # e.g. CUDA out of memory
        if device == "cuda" and "out of memory" in str(e).lower():
            torch.cuda.empty_cache()
            device = "cpu"
            note = "GPU was out of free memory, so this run used the CPU."
            acc, train_loss = _fit_once(Xtr, ytr, Xte, yte, classes, model,
                                        epochs, lr, batch, device, seed)
        else:
            raise
    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()             # release memory for the next run
    return {"accuracy": acc, "chance": 1.0 / n_cls, "classes": list(classes),
            "n_train": int(len(Xtr)), "n_test": int(len(Xte)),
            "n_chans": C, "n_times": T, "model": model, "device": device,
            "train_loss": train_loss, "note": note}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source",
                    choices=["synthetic", "alpha", "motor", "eegbci", "npz"],
                    default="motor",
                    help="eegbci is an alias for motor (imagine left/right hand)")
    ap.add_argument("--npz", help="path to a .npz from ironbci32_stream.py")
    ap.add_argument("--model", choices=list(MODELS), default="shallow")
    ap.add_argument("--epochs", type=int, default=25)
    ap.add_argument("--lr", type=float, default=6.25e-4)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto",
                    help="auto uses GPU if free; cpu is instant for small models")
    args = ap.parse_args()

    device = resolve_device(args.device)
    print(f"Requested device: {device.upper()}  (GPU used when it fits, else CPU)"
          f"  ·  PyTorch {torch.__version__}")

    if args.source == "npz":
        if not args.npz:
            ap.error("--source npz requires --npz PATH")
        X, y, classes, sfreq, _ = load_npz(args.npz)
    elif args.source == "synthetic":
        X, y, classes, sfreq, _ = load_synthetic()
    else:
        print("Loading public EEG (first run downloads a sample)…")
        X, y, classes, sfreq, _ = get_data(args.source)

    print(f"data X={X.shape}  classes={classes}  "
          f"chance={100/len(classes):.0f}%  sfreq={sfreq:.0f}Hz")
    res = train_model(X, y, classes, model=args.model, epochs=args.epochs,
                      lr=args.lr, batch=args.batch, device=device)
    if res["note"]:
        print(res["note"])
    print(f"\nTrained on: {res['device'].upper()}")
    print(f"TEST ACCURACY = {res['accuracy']*100:.1f}%   "
          f"(chance = {res['chance']*100:.0f}%)")


if __name__ == "__main__":
    main()
