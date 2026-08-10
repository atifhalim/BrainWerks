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
        "label": "Synthetic — instant, no download",
        "blurb": "Made-up but learnable data. Every knob is yours to change. "
                 "Great for a first run and for experimenting fast.",
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


def do_preview(body):
    dataset = body["dataset"]
    params = coerce(dataset, body.get("params", {}))
    X, y, classes, sfreq = tl.get_data(dataset, **params)
    counts = {c: int((y == i).sum()) for i, c in enumerate(classes)}
    # A small readable slice of raw data: trial 0, up to 8 channels, 12 samples.
    ch = min(X.shape[1], 8)
    cols = min(X.shape[2], 12)
    table = np.round(X[0, :ch, :cols], 1).tolist()
    return {
        "shape": list(X.shape),
        "trials": int(X.shape[0]), "channels": int(X.shape[1]),
        "n_times": int(X.shape[2]), "sfreq": float(sfreq),
        "clip_sec": (X.shape[2] / sfreq) if sfreq else None,
        "classes": list(classes), "chance": 100.0 / len(classes),
        "counts": counts,
        "table": table, "row_labels": [f"ch{i+1}" for i in range(ch)],
        "col_labels": [f"t{i}" for i in range(cols)],
        "units": "microvolts (µV)",
    }


def do_train(body):
    dataset = body["dataset"]
    params = coerce(dataset, body.get("params", {}))
    model = body.get("model", "shallow")
    epochs = int(body.get("epochs", 25))
    lr = float(body.get("lr", 6.25e-4))
    batch = int(body.get("batch", 16))
    device = tl.resolve_device(body.get("device", "cpu"))  # cpu default = no OOM
    X, y, classes, _ = tl.get_data(dataset, **params)
    with _train_lock:
        res = tl.train_model(X, y, classes, model=model, epochs=epochs,
                             lr=lr, batch=batch, device=device)
    res["accuracy_pct"] = round(res["accuracy"] * 100, 1)
    res["chance_pct"] = round(res["chance"] * 100, 1)
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
    print(f"BrainWerks Tutorial #1 web app")
    print(f"  open  http://localhost:{PORT}   (or http://<jetson-ip>:{PORT} "
          f"from another computer)")
    print(f"  GPU visible to PyTorch: {tl.torch.cuda.is_available()}   "
          f"(training defaults to CPU to avoid out-of-memory)")
    print("  Ctrl+C to stop.")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
