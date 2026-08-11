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
# The three Tutorial #1 datasets, and — exactly like the Colab — only the knobs
# each dataset's experimenters left open. Synthetic lets you set its whole shape;
# the two real datasets let you pick how many channels and the clip length, while
# their classes and sampling rate are fixed by the recording.
DATASETS = {
    "synthetic": {
        "label": "Synthetic (random noise)",
        "blurb": "Random noise with RANDOM class labels — there is NO pattern, "
                 "so accuracy should stay near chance (100 ÷ classes %). That is "
                 "the whole point of Tutorial #1: no pattern, no learning. You "
                 "set its whole shape below; the slides used 100 trials, 3 "
                 "channels, 1024 samples, 4 classes, at 250 Hz (4 ms per sample).",
        "params": [
            {"name": "trials",   "label": "Trials (clips)",       "type": "int",
             "default": 100, "min": 60,  "max": 300,  "step": 10},
            {"name": "channels", "label": "Channels",             "type": "int",
             "default": 3,   "min": 2,   "max": 8,    "step": 1},
            {"name": "n_times",  "label": "Time (samples)",       "type": "int",
             "default": 1024, "min": 512, "max": 2048, "step": 64},
            {"name": "classes",  "label": "Classes",              "type": "int",
             "default": 4,   "min": 2,   "max": 4,    "step": 1},
        ],
    },
    "alpha": {
        "label": "Real: eyes open vs closed (alpha)",
        "blurb": "Real EEG, two classes: eyes OPEN vs CLOSED. Alpha waves grow "
                 "when the eyes close (occipital channels). Choose how many "
                 "channels and the clip length; the 2 classes and the sampling "
                 "rate are fixed by the recording.",
        "fixed": "Fixed by the dataset: 2 classes, sampling rate 160 Hz.",
        "params": [
            {"name": "channels", "label": "Channels to use",      "type": "int",
             "default": 6,   "min": 2,   "max": len(tl.ALPHA_POOL), "step": 1},
            {"name": "clip",     "label": "Clip length (seconds)", "type": "float",
             "default": 2.0, "min": 2.0, "max": 4.0,  "step": 0.5},
        ],
    },
    "motor": {
        "label": "Real: imagine LEFT vs RIGHT hand",
        "blurb": "Real EEG, two classes: imagine moving the LEFT vs RIGHT hand "
                 "(motor channels). Choose how many channels and the clip length; "
                 "the 2 classes and the sampling rate are fixed by the recording. "
                 "The hardest task here.",
        "fixed": "Fixed by the dataset: 2 classes, sampling rate 160 Hz.",
        "params": [
            {"name": "channels", "label": "Channels to use",      "type": "int",
             "default": 3,   "min": 2,   "max": len(tl.MOTOR_POOL), "step": 1},
            {"name": "clip",     "label": "Clip length (seconds)", "type": "float",
             "default": 2.0, "min": 2.0, "max": 4.0,  "step": 0.5},
        ],
    },
    # Tutorial #2 — the BCI Competition IV 2a benchmark. Everything about the
    # recording is fixed by the experiment; the only thing you pick is which of
    # the 9 subjects to load. Needs `moabb` installed in the container.
    "bcic2a": {
        "label": "BCI Competition IV 2a — 4-class motor imagery",
        "blurb": "Real EEG from the reference motor-imagery benchmark "
                 "(MOABB 'BNCI2014_001'). One subject imagines LEFT hand, RIGHT "
                 "hand, both FEET, or TONGUE — 22 channels at 250 Hz, band-passed "
                 "4–38 Hz and standardized, cut into 4.5 s trials. Pick which of "
                 "the 9 subjects to explore.",
        "fixed": "Fixed by the experiment: 4 classes, 22 EEG channels, 250 Hz, "
                 "1125 samples (4.5 s) per trial. Needs `moabb`; first load "
                 "downloads the subject (hundreds of MB).",
        "params": [
            {"name": "subject", "label": "Subject (1–9)", "type": "int",
             "default": 3, "min": 1, "max": 9, "step": 1},
        ],
    },
}

# The website groups examples under one "Examples" tab. Each example is one page
# that reuses the same dataset/model machinery, showing only its own datasets.
EXAMPLES = [
    {"slug": "tutorial1", "page": "tutorial1.html",
     "title": "Tutorial #1 — See & Train on EEG",
     "summary": "Synthetic vs real EEG: view the raw data, train a model, read "
                "the accuracy. Start here.",
     "datasets": ["synthetic", "alpha", "motor"]},
    {"slug": "tutorial2", "page": "tutorial2.html",
     "title": "Basic Brain Decoding on EEG Data",
     "summary": "The BCI Competition IV 2a benchmark — 4-class motor imagery, "
                "22 channels. Explore the dataset in detail.",
     "datasets": ["bcic2a"]},
]

MODELS = [
    {"name": "shallow", "label": "ShallowFBCSPNet — small & fast (good default)"},
    {"name": "deep",    "label": "Deep4Net — deeper, needs more data"},
    {"name": "eegnet",  "label": "EEGNet — compact, few parameters"},
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


_cache = {}          # tiny load cache: {key -> (X, y, classes, sfreq, ch_names)}
_CACHE_MAX = 2       # keep the last couple of loads (real datasets are heavy)


def _load(dataset, body):
    """Load a dataset for preview or training, with matching params so both see
    the same data. The web app's synthetic is the Colab kind: random, no pattern.
    Cached so a heavy dataset (e.g. BCIC IV 2a) is not reloaded between the
    'view' and 'train' clicks. Returns (X, y, class_names, sfreq, ch_names)."""
    params = coerce(dataset, body.get("params", {}))
    if dataset == "synthetic":
        params.setdefault("pattern", False)
    key = (dataset, tuple(sorted(params.items())))
    if key not in _cache:
        if len(_cache) >= _CACHE_MAX:
            _cache.pop(next(iter(_cache)))       # evict the oldest entry
        _cache[key] = tl.get_data(dataset, **params)
    return _cache[key]


# How much of the (potentially huge) data to ship to the page.
RAW_ROWS = 15        # raw-data table: first N time-samples of one clip
TENSOR_ROWS = 40     # pipeline table: first N of the trials×samples rows
CH_SHOW = 8          # cap channels shown so the tables stay readable


def do_preview(body):
    dataset = body["dataset"]
    X, y, classes, sfreq, ch_names = _load(dataset, body)
    ntr, C, T = int(X.shape[0]), int(X.shape[1]), int(X.shape[2])
    counts = {c: int((y == i).sum()) for i, c in enumerate(classes)}
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
    X, y, classes, _, _ = _load(dataset, body)   # (X, y, classes, sfreq, ch_names)
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

    def _send_file(self, name, ctype):
        path = os.path.join(HERE, name)
        if not os.path.isfile(path):
            return self._send(404, {"error": "not found"})
        with open(path, "rb") as f:
            self._send(200, f.read(), ctype)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        pages = {"/": "examples.html", "/index.html": "examples.html",
                 "/examples": "examples.html"}
        for ex in EXAMPLES:                       # /tutorial1, /tutorial2, …
            pages[f"/{ex['slug']}"] = ex["page"]
        if path in pages:
            self._send_file(pages[path], "text/html; charset=utf-8")
        elif path == "/app.js":
            self._send_file("app.js", "application/javascript; charset=utf-8")
        elif path == "/app.css":
            self._send_file("app.css", "text/css; charset=utf-8")
        elif path == "/api/config":
            self._send(200, {"datasets": DATASETS, "models": MODELS,
                             "examples": EXAMPLES,
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
    print("BrainWerks — Examples web app")
    print(f"  open  http://localhost:{PORT}   (or http://<jetson-ip>:{PORT} "
          f"from another computer)")
    print(f"  GPU visible to PyTorch: {tl.torch.cuda.is_available()}   "
          f"(Auto uses the GPU when it fits, and falls back to CPU otherwise)")
    print("  Ctrl+C to stop.")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
