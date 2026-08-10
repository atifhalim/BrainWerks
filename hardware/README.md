# Hardware — IronBCI-32 on NVIDIA Jetson

Scripts for recording EEG from the PiEEG **IronBCI-32** (32-channel) and training
braindecode models on a Jetson (or any Linux computer).

**On a Jetson?** See **[JETSON.md](JETSON.md)** for the exact copy-paste recipe:
container setup, the "bake your own image" step, and a one-command daily startup.

| File | What it does | Needs |
|------|--------------|-------|
| `train_local.py` | Train a braindecode model locally (CPU or GPU). Works today on public motor-imagery data (`--source eegbci`) or your own recordings (`--source npz file.npz`). | braindecode, mne, scikit-learn |
| `ironbci32_stream.py` | Talk to the IronBCI-32 over USB via BrainFlow. `--mode monitor` shows live signal; `--mode record` runs a cued session and saves a labeled `X, y` dataset (`.npz`). | brainflow, numpy |
| `setup_jetson_ironbci32.sh` | One-shot Jetson prep for the board: build tools, serial permissions, build BrainFlow from source, verify IronBCI-32 support. | — |
| `webapp/` | Bare-bones **web app** for Tutorial #1 — pick a dataset, view the data, tune parameters, pick a model, train, read the accuracy. Runs on the Jetson, standard library only (no Flask/npm). See [`webapp/README.md`](webapp/README.md). | braindecode, mne (already in the Jetson container) |

## Quick start

Pull a script onto the Jetson (public repo, no auth needed):

```bash
wget https://raw.githubusercontent.com/atifhalim/BrainWerks/main/hardware/train_local.py
```

Train locally on public data (no hardware needed):

```bash
python3 train_local.py --source eegbci --model shallow --epochs 25
```

Record from the board (battery-powered!), then train on it:

```bash
python3 ironbci32_stream.py --serial-port /dev/ttyACM0 --mode record \
    --classes open,closed --trials-per-class 20 --out session1.npz
python3 train_local.py --source npz session1.npz --model eegnet --epochs 40
```

## Safety

The IronBCI-32 and everything wired to it (including the Jetson) **must run on
battery** — full isolation from mains power — whenever electrodes are on a head.
Do the first runs with an adult. Not a medical device; for learning/research only.
