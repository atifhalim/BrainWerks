# BrainWerks Tutorial #1 — web app (runs on your Jetson)

The same workflow as the Colab notebook, but the **runtime is your Jetson**:

1. **Pick a dataset** 2. **View the raw data** 3. **Adjust the open parameters**
4. **Pick a model** 5. **Train** 6. **Read the test accuracy**

It's deliberately bare-bones and uses **only Python's standard library** for the
web server — no Flask, no Node/npm, nothing extra to install. It imports the
training code from `../train_local.py`, so the website and the command line run
the **exact same** braindecode pipeline.

## Run it

Inside your Jetson container (the one that already has braindecode/mne/torch —
see [`../JETSON.md`](../JETSON.md)):

```bash
cd hardware/webapp
python3 server.py
```

Then open a browser:

- **On the Jetson:** <http://localhost:8000>
- **From your laptop/phone on the same Wi-Fi:** `http://<jetson-ip>:8000`
  (find the Jetson's IP with `hostname -I`). This works because you launch the
  container with `--network host`, so the port is shared with the Jetson.

Change the port with `PORT=9000 python3 server.py` if 8000 is taken.

## What each dataset gives you

| Dataset | Real data? | Download? | You can change |
|---|---|---|---|
| **Synthetic** | No (made-up but learnable) | None | clips, channels, samples, classes |
| **Motor imagery (eegbci)** | Yes — imagined left vs. right hand | Once, ~small | clip length (seconds) |

Start with **Synthetic** — it's instant and needs no network, so you can confirm
the whole loop in seconds. Then switch to **Motor imagery** for real EEG (the
first run downloads a sample, which can take a minute).

## Notes

- **Training uses the CPU by default.** These EEG models are tiny, so the CPU
  finishes them in seconds, and it sidesteps the shared-memory `CUDA out of
  memory` error on the 8GB Xavier NX. The page tells you if a GPU is present.
- **One training at a time.** The server serializes training runs with a lock so
  two clicks can't fight over the Jetson's memory.
- **To add another dataset or model**, edit the `DATASETS` / `MODELS` tables at
  the top of `server.py` and add a loader in `../train_local.py`. The page builds
  its controls from those tables automatically.
