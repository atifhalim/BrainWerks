#!/usr/bin/env python3
"""
train_local.py — train a braindecode model locally (Jetson or any computer).

Data sources:
  --source synthetic  Fake but learnable EEG-shaped data. Instant, no download,
                      no network — great for a first run and for the web app.
  --source eegbci     Public motor-imagery EEG (downloads via MNE). Real data,
                      no hardware — confirms your full training setup.
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
# Data loaders — each returns (X, y, class_names, sfreq)
#   X : float32 array (trials, channels, time)   in microvolts
#   y : int64   array (trials,)                  class index per trial
# --------------------------------------------------------------------------- #
def load_synthetic(trials=120, channels=3, n_times=1024, classes=4, seed=0,
                   pattern=True):
    """Synthetic EEG-shaped data. Two flavors, chosen by `pattern`:

      pattern=True  (default): random noise + a per-class sine bump, so each
          class carries a distinct rhythm a model can learn — it scores well
          above chance with no download. Good for verifying the pipeline runs
          (CLI, two-box smoke test).
      pattern=False: pure random noise with RANDOM labels — there is NO pattern,
          so accuracy should stay near chance. This is what Tutorial #1 (the
          slides and the Colab notebook) teaches: random data → no learning.

    Every knob here is adjustable in the web app."""
    rng = np.random.default_rng(seed)
    sfreq = 128.0
    if not pattern:
        # Colab semantics: labels are independent of the signal, so nothing to
        # learn. ~8 µV of noise, like the notebook's synthetic source.
        X = (rng.standard_normal((trials, channels, n_times)) * 8.0).astype("float32")
        y = rng.integers(0, classes, trials).astype("int64")
        names = [f"class {i}" for i in range(classes)]
        return X, y, names, sfreq
    t = np.arange(n_times) / sfreq
    y = np.tile(np.arange(classes), trials // classes + 1)[:trials].astype("int64")
    rng.shuffle(y)
    X = (rng.standard_normal((trials, channels, n_times)) * 5.0).astype("float32")
    for i, c in enumerate(y):                 # each class gets its own rhythm
        freq = 6.0 + 2.0 * c                  # 6, 8, 10, 12 … Hz
        X[i] += (12.0 * np.sin(2 * np.pi * freq * t)).astype("float32")
    names = [f"class {i}" for i in range(classes)]
    return X, y, names, sfreq


def load_eegbci(clip=2.0, channels=("C3", "Cz", "C4")):
    raws = []
    for run in (4, 8, 12):                       # imagined left/right fist
        fn = mne.datasets.eegbci.load_data(1, [run], update_path=True)
        r = mne.io.read_raw_edf(fn[0], preload=True)
        mne.datasets.eegbci.standardize(r)
        raws.append(r)
    raw = mne.concatenate_raws(raws)
    raw.pick(list(channels))
    events, eid = mne.events_from_annotations(raw)
    ep = mne.Epochs(raw, events, {k: eid[k] for k in ("T1", "T2")},
                    tmin=0.0, tmax=clip - 1 / raw.info["sfreq"],
                    baseline=None, preload=True)
    X = (ep.get_data() * 1e6).astype("float32")
    y = (ep.events[:, -1] == eid["T2"]).astype("int64")
    return X, y, ["left hand", "right hand"], float(raw.info["sfreq"])


def load_npz(path):
    d = np.load(path, allow_pickle=True)
    sfreq = float(d["sfreq"]) if "sfreq" in d else 0.0
    return (d["X"].astype("float32"), d["y"].astype("int64"),
            list(d["classes"]), sfreq)


def get_data(source, **params):
    """Dispatch to a loader by name. Extra params are passed through."""
    if source == "synthetic":
        return load_synthetic(**params)
    if source == "eegbci":
        return load_eegbci(**params)
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
    ap.add_argument("--source", choices=["synthetic", "eegbci", "npz"],
                    default="eegbci")
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
        X, y, classes, sfreq = load_npz(args.npz)
    elif args.source == "synthetic":
        X, y, classes, sfreq = load_synthetic()
    else:
        print("Loading public motor-imagery EEG (first run downloads a sample)…")
        X, y, classes, sfreq = load_eegbci()

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
