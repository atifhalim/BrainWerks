#!/usr/bin/env python3
"""
server.py — a tiny, zero-dependency web app for BrainWerks Tutorial #1.

Runs the SAME workflow as the Colab notebook, but on your Jetson:
  1. pick a dataset      2. view the raw data      3. adjust parameters
  4. pick a model        5. train                  6. read the test accuracy

Uses only the Python standard library for the web server, and imports the
training code from ../train_local.py — so the website and the command line run
exactly the same braindecode pipeline. No Flask, no npm, nothing to pip install.

Run it (inside your Jetson container, which already has braindecode/mne/torch):

    cd hardware/webapp
    python3 server.py                 # then open http://<jetson-ip>:8000

From another computer on the same network, use the Jetson's IP address. On the
Jetson itself, http://localhost:8000 works too.
"""
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np

# Import the training pipeline from the sibling file (hardware/train_local.py).
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import train_local as tl   # noqa: E402

PORT = int(os.environ.get("PORT", "8000"))

# Which knobs each dataset exposes. The page renders controls from this, so the
# UI always matches what the dataset actually lets you change (like the Colab).
DATASETS = {
    "synthetic": {
        "label": "Synthetic (random noise) — instant, no download",
        "blurb": "Random noise with RANDOM class labels — there is NO pattern, "
                 "so accuracy should stay near chance (100 ÷ classes %). That is "
                 "the whole point of Tutorial #1: no pattern, no learning. Every "
                 "knob below is yours to set.",
        "params": [
            {"name": "trials",   "label": "Clips (trials)",     "type": "int",
             "default": 120, "min": 40, "max": 400, "step": 4},
            {"name": "channels", "label": "Channels",           "type": "int",
             "default": 3,   "min": 1,  "max": 16,  "step": 1},
            {"name": "n_times",  "label": "Samples per clip",   "type": "int",
             "default": 1024, "min": 128, "max": 2048, "step": 64},
            {"name": "classes",  "label": "Classes",            "type": "int",
             "default": 4,   "min": 2,  "max": 6,   "step": 1},
        ],
    },
    "eegbci": {
        "label": "Motor imagery — real EEG (downloads once)",
        "blurb": "Real recordings of a person imagining moving their left vs. "
                 "right hand. Channels are fixed by the experiment (C3, Cz, C4); "
                 "you choose how many seconds each clip is.",
        "params": [
            {"name": "clip", "label": "Clip length (seconds)", "type": "float",
             "default": 2.0, "min": 1.0, "max": 4.0, "step": 0.5},
        ],
    },
}

MODELS = [
    {"name": "shallow", "label": "ShallowFBCSPNet — small & fast (good default)"},
    {"name": "eegnet",  "label": "EEGNet — compact, few parameters"},
    {"name": "deep",    "label": "Deep4Net — deeper, needs more data"},
]

_train_lock = threading.Lock()   # one training at a time (protects Jetson memory)


def coerce(dataset, raw):
    """Turn incoming JSON strings into the types each loader expects."""
    out = {}
    for spec in DATASETS[dataset]["params"]:
        if spec["name"] in raw and raw[spec["name"]] not in ("", None):
            v = raw[spec["name"]]
            out[spec["name"]] = int(v) if spec["type"] == "int" else float(v)
    return out


def _load(dataset, body):
    """Load a dataset for preview or training, with matching params so both see
    the same data. The web app's synthetic is the Colab kind: random, no pattern."""
    params = coerce(dataset, body.get("params", {}))
    if dataset == "synthetic":
        params.setdefault("pattern", False)
    return (*tl.get_data(dataset, **params), params)


def _ch_names(dataset, n_chans):
    """Display names per channel. eegbci is recorded at C3/Cz/C4; synthetic is
    generic ch1…chN — same as the notebook."""
    if dataset == "eegbci":
        base = ["C3", "Cz", "C4"]
        return (base + [f"ch{i+1}" for i in range(len(base), n_chans)])[:n_chans]
    return [f"ch{i+1}" for i in range(n_chans)]


# How much of the (potentially huge) data to ship to the page.
RAW_ROWS = 15        # raw-data table: first N time-samples of one clip
TENSOR_ROWS = 40     # pipeline table: first N of the trials×samples rows
CH_SHOW = 8          # cap channels shown so the tables stay readable


def do_preview(body):
    dataset = body["dataset"]
    X, y, classes, sfreq, _ = _load(dataset, body)
    ntr, C, T = int(X.shape[0]), int(X.shape[1]), int(X.shape[2])
    counts = {c: int((y == i).sum()) for i, c in enumerate(classes)}
    ch_names = _ch_names(dataset, C)
    ch_show = min(C, CH_SHOW)

    def t_ms(sample):
        return round(sample / sfreq * 1000, 1) if sfreq else float(sample)

    # 1) RAW DATA — one clip, as Colab's "Explore the data": rows are moments in
    #    time (samples), columns are channels, values are µV.
    r_rows = min(T, RAW_ROWS)
    clip0 = np.round(X[0, :ch_show, :r_rows], 2)          # (ch_show, r_rows)
    raw = {
        "ch_names": ch_names[:ch_show],
        "rows": [[t_ms(s)] + clip0[:, s].tolist() for s in range(r_rows)],
        "n_show": r_rows, "n_total": T,
    }

    # 2) PIPELINE TENSOR — stack every clip into X and y, as Colab's Step 2:
    #    a scrollable table with Trial (which epoch), Sample, Time, then channels.
    t_rows, count = [], 0
    Xr = np.round(X[:, :ch_show, :], 2)
    for tr in range(ntr):
        for s in range(T):
            t_rows.append([tr, s, t_ms(s)] + Xr[tr, :, s].tolist())
            count += 1
            if count >= TENSOR_ROWS:
                break
        if count >= TENSOR_ROWS:
            break
    tensor = {
        "ch_names": ch_names[:ch_show],
        "y_head": [int(v) for v in y[:14]],
        "rows": t_rows, "n_show": len(t_rows), "n_total": ntr * T,
    }

    return {
        "shape": [ntr, C, T], "trials": ntr, "channels": C, "n_times": T,
        "sfreq": float(sfreq), "clip_sec": (T / sfreq) if sfreq else None,
        "classes": list(classes), "chance": 100.0 / len(classes),
        "counts": counts, "ch_names": ch_names, "ch_show": ch_show,
        "raw": raw, "tensor": tensor, "units": "microvolts (µV)",
    }


def _verdict(acc, chance):
    """Same plain-language read as the Colab notebook's Step 4."""
    if acc >= chance + 0.15:
        return "Well above chance — it really learned the pattern!"
    if acc >= chance + 0.05:
        return "A bit above chance — try more passes or another model."
    return "Around chance — like the random-noise task, no real pattern was found."


def do_train(body):
    dataset = body["dataset"]
    model = body.get("model", "shallow")
    epochs = int(body.get("epochs", 25))
    lr = float(body.get("lr", 6.25e-4))
    batch = int(body.get("batch", 16))
    device = body.get("device", "auto")   # auto = GPU when it fits, else CPU
    X, y, classes, _, _ = _load(dataset, body)
    with _train_lock:                      # one training at a time (protect memory)
        res = tl.train_model(X, y, classes, model=model, epochs=epochs,
                             lr=lr, batch=batch, device=device)
    res["accuracy_pct"] = round(res["accuracy"] * 100, 1)
    res["chance_pct"] = round(res["chance"] * 100, 1)
    res["verdict"] = _verdict(res["accuracy"], res["chance"])
    return res


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):            # keep the console quiet & friendly
        pass

    def _send(self, code, payload, ctype="application/json"):
        data = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            with open(os.path.join(HERE, "index.html"), "rb") as f:
                self._send(200, f.read(), "text/html; charset=utf-8")
        elif self.path == "/api/config":
            self._send(200, {"datasets": DATASETS, "models": MODELS,
                             "cuda": tl.torch.cuda.is_available()})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return self._send(400, {"error": "bad JSON"})
        try:
            if self.path == "/api/preview":
                self._send(200, do_preview(body))
            elif self.path == "/api/train":
                self._send(200, do_train(body))
            else:
                self._send(404, {"error": "not found"})
        except Exception as e:                       # surface errors to the page
            self._send(500, {"error": f"{type(e).__name__}: {e}"})


def main():
    print("BrainWerks Tutorial #1 web app")
    print(f"  open  http://localhost:{PORT}   (or http://<jetson-ip>:{PORT} "
          f"from another computer)")
    print(f"  GPU visible to PyTorch: {tl.torch.cuda.is_available()}   "
          f"(Auto uses the GPU when it fits, and falls back to CPU otherwise)")
    print("  Ctrl+C to stop.")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
