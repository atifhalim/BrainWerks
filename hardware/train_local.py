#!/usr/bin/env python3
"""
train_local.py — train a braindecode model locally (Jetson or any computer).

Data sources:
  --source eegbci   Public motor-imagery EEG (downloads via MNE). Works today,
                    no hardware — great for confirming your training setup.
  --source npz PATH Your own recording saved by ironbci32_stream.py.

Only needs: braindecode, mne, scikit-learn (which pull in torch + skorch).
Uses the GPU automatically if PyTorch sees CUDA; otherwise CPU (fine for these).

Examples
--------
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
    return X, y, ["left hand", "right hand"]


def load_npz(path):
    d = np.load(path, allow_pickle=True)
    return d["X"].astype("float32"), d["y"].astype("int64"), list(d["classes"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["eegbci", "npz"], default="eegbci")
    ap.add_argument("--npz", help="path to a .npz from ironbci32_stream.py")
    ap.add_argument("--model", choices=list(MODELS), default="shallow")
    ap.add_argument("--epochs", type=int, default=25)
    ap.add_argument("--lr", type=float, default=6.25e-4)
    ap.add_argument("--batch", type=int, default=16)
    args = ap.parse_args()

    set_random_seeds(20240205, cuda=torch.cuda.is_available())
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training on: {device.upper()}  (PyTorch {torch.__version__})")

    if args.source == "npz":
        if not args.npz:
            ap.error("--source npz requires --npz PATH")
        X, y, classes = load_npz(args.npz)
    else:
        print("Loading public motor-imagery EEG (first run downloads a sample)…")
        X, y, classes = load_eegbci()

    n_cls, C, T = len(classes), X.shape[1], X.shape[2]
    print(f"data X={X.shape}  classes={classes}  chance={100/n_cls:.0f}%")

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25,
                                          random_state=1, stratify=y)
    Model = MODELS[args.model]
    extra = {"final_conv_length": "auto"} if args.model in ("shallow", "deep") else {}

    def make_model(**kw):
        try:                                     # braindecode >= 0.8 naming
            return Model(n_chans=C, n_outputs=n_cls, n_times=T, **kw)
        except TypeError:                        # older braindecode naming
            return Model(in_chans=C, n_classes=n_cls, input_window_samples=T, **kw)

    mod = make_model(**extra)
    clf = EEGClassifier(mod, criterion=torch.nn.CrossEntropyLoss,
                        optimizer=torch.optim.Adam, optimizer__lr=args.lr,
                        batch_size=args.batch, max_epochs=args.epochs,
                        iterator_train__drop_last=False,   # train even on small sets
                        train_split=ValidSplit(0.2), device=device, verbose=1)
    clf.fit(Xtr, ytr)
    acc = clf.score(Xte, yte)
    print(f"\nTEST ACCURACY = {acc*100:.1f}%   (chance = {100/n_cls:.0f}%)")


if __name__ == "__main__":
    main()
