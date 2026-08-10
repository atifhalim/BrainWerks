#!/usr/bin/env python3
"""
compute.py — the COMPUTE BOX half of the two-box design.

Its whole job: connect to a Sensor Box, collect the labeled epochs it streams,
and train a braindecode model on them. It never touches the electrodes, so it's
free to live on mains power and lean on the GPU.

    Sensor Box  ──(TCP: session, epoch…, end)──▶  Compute Box  ──▶  train_model

It reuses train_local.train_model(), so the two-box path and the single-file
CLI/web-app path run the *exact same* training code.

Run both halves on ONE Xavier now (default connects to localhost); point this at
the other machine later with --host <sensor-ip>. Nothing else changes.

Examples
--------
  # Xavier-only — pair with `sensor.py` in another terminal
  python3 compute.py --model shallow --epochs 25

  # when the second machine is ready:
  python3 compute.py --host 192.168.1.50 --model eegnet --epochs 40
"""
import argparse
import os
import socket
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)                      # for `protocol`
sys.path.insert(0, os.path.dirname(HERE))     # for `train_local`
import protocol as proto                      # noqa: E402


def collect(host, port):
    """Connect to a Sensor Box and drain its stream into (X, y, meta)."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.connect((host, port))
        first = proto.recv_msg(sock)
        if first is None:
            raise ConnectionError("Sensor Box closed before sending a session.")
        session, _ = first
        if session.get("type") != "session":
            raise ValueError(f"expected 'session' first, got {session.get('type')}")
        classes = session["classes"]
        print(f"Session: source={session['source']}  classes={classes}  "
              f"sfreq={session['sfreq']:.0f}Hz. Receiving epochs…")

        X, y = [], []
        while True:
            msg = proto.recv_msg(sock)
            if msg is None:                    # peer closed without an 'end'
                break
            header, payload = msg
            kind = header.get("type")
            if kind == "epoch":
                arr, label = proto.unpack_epoch(header, payload)
                X.append(arr)
                y.append(label)
                cls = classes[label] if label < len(classes) else label
                print(f"  received epoch {len(X)}  label={cls}", end="\r")
            elif kind == "end":
                break
    print()
    return (np.asarray(X, dtype="float32"),
            np.asarray(y, dtype="int64"), session)


def main():
    ap = argparse.ArgumentParser(description="Two-box design: the Compute Box.")
    ap.add_argument("--host", default="127.0.0.1",
                    help="Sensor Box address. 127.0.0.1 = same Xavier (default); "
                         "use the other machine's IP once it's ready.")
    ap.add_argument("--port", type=int, default=9000)
    ap.add_argument("--model", default="shallow",
                    help="shallow | deep | eegnet")
    ap.add_argument("--epochs", type=int, default=25)
    ap.add_argument("--lr", type=float, default=6.25e-4)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    args = ap.parse_args()

    print(f"Compute Box connecting to Sensor Box at {args.host}:{args.port}…")
    X, y, session = collect(args.host, args.port)
    classes = session["classes"]

    if len(X) == 0:
        print("Sensor Box sent no epochs — nothing to train on.")
        return

    print(f"Collected X={X.shape}  y={y.shape}  classes={classes}. Training…\n")

    # Import torch-heavy training code only after the stream is in hand.
    import train_local as tl
    res = tl.train_model(X, y, classes, model=args.model, epochs=args.epochs,
                         lr=args.lr, batch=args.batch, device=args.device)
    if res["note"]:
        print(res["note"])
    print(f"\nTrained on: {res['device'].upper()}")
    print(f"TEST ACCURACY = {res['accuracy']*100:.1f}%   "
          f"(chance = {res['chance']*100:.0f}%)")


if __name__ == "__main__":
    main()
