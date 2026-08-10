#!/usr/bin/env python3
"""
sensor.py — the SENSOR BOX half of the two-box design.

Its whole job: get labeled EEG epochs and publish them over the network. It
does NOT train anything, so it stays featherlight — numpy + stdlib, plus
brainflow only when you actually talk to the board.

    Sensor Box  ──(TCP: session, epoch…, end)──▶  Compute Box

Sources (so it runs today, with or without the headset):
  synthetic : made-up but learnable epochs. Instant, no hardware, no network.
  replay    : stream an existing .npz recording, one epoch at a time.
  ironbci   : record live from the IronBCI-32 (needs brainflow; battery only!).

Run both halves on ONE Xavier now (default binds localhost); point them at two
machines later by changing --host / --port. Nothing else changes.

Examples
--------
  # Xavier-only, synthetic — pair with `compute.py` in another terminal
  python3 sensor.py --source synthetic --classes rest,move --per-class 40

  # replay a real recording to the Compute Box
  python3 sensor.py --source replay --npz session1.npz

  # when the second machine is ready, just open the bind address:
  python3 sensor.py --source synthetic --host 0.0.0.0

Safety: with a real IronBCI-32 on a head, the Sensor Box and everything wired
to it run on BATTERY — never mains. That rule lives with this box.
"""
import argparse
import os
import socket
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)                      # for `protocol`
sys.path.insert(0, os.path.dirname(HERE))     # for `train_local` (synthetic gen)
import protocol as proto                      # noqa: E402


# --------------------------------------------------------------------------- #
# Epoch sources — each yields (array (channels, times), label:int) and exposes
# a small meta dict (sfreq, ch_names, classes) sent in the `session` message.
# --------------------------------------------------------------------------- #
def source_synthetic(classes, per_class, channels, n_times, seed):
    """Reuse train_local.load_synthetic so both boxes share one data recipe."""
    import train_local as tl
    n = len(classes) * per_class
    X, y, _, sfreq, _ = tl.load_synthetic(trials=n, channels=channels,
                                          n_times=n_times, classes=len(classes),
                                          seed=seed)
    meta = {"sfreq": float(sfreq),
            "ch_names": [f"ch{i+1}" for i in range(channels)],
            "classes": list(classes)}
    return meta, list(zip(X, (int(v) for v in y)))


def source_replay(npz_path):
    """Stream the epochs saved by ironbci32_stream.py, one at a time."""
    d = np.load(npz_path, allow_pickle=True)
    X = d["X"].astype("float32")
    y = d["y"].astype("int64")
    classes = list(d["classes"]) if "classes" in d else \
        [str(i) for i in range(int(y.max()) + 1)]
    sfreq = float(d["sfreq"]) if "sfreq" in d else 0.0
    ch_names = list(d["ch_names"]) if "ch_names" in d else \
        [f"ch{i+1}" for i in range(X.shape[1])]
    meta = {"sfreq": sfreq, "ch_names": ch_names, "classes": classes}
    return meta, list(zip(X, (int(v) for v in y)))


def source_ironbci(serial_port, classes, per_class, clip_sec, prep_sec, band):
    """Record live from the board. Imported lazily so the other sources never
    need brainflow installed."""
    import ironbci32_stream as ib
    board, eeg, sfreq = ib.connect(serial_port)
    try:
        X, y = ib.record(board, eeg, sfreq, list(classes), per_class,
                         clip_sec, prep_sec, band)
    finally:
        board.stop_stream()
        board.release_session()
    meta = {"sfreq": float(sfreq),
            "ch_names": [f"ch{i+1}" for i in range(len(eeg))],
            "classes": list(classes)}
    return meta, list(zip(X, (int(v) for v in y)))


# --------------------------------------------------------------------------- #
# Serve one Compute Box: session header, then every epoch, then `end`.
# --------------------------------------------------------------------------- #
def serve(conn, source, meta, epochs, rate):
    proto.send_msg(conn, {"type": "session", "source": source,
                          "dtype": "float32", **meta})
    interval = 1.0 / rate if rate and rate > 0 else 0.0
    for i, (arr, label) in enumerate(epochs, 1):
        header, payload = proto.pack_epoch(np.asarray(arr, dtype="float32"), label)
        proto.send_msg(conn, header, payload)
        cls = meta["classes"][label] if label < len(meta["classes"]) else label
        print(f"  sent epoch {i}/{len(epochs)}  label={cls}")
        if interval:
            time.sleep(interval)
    proto.send_msg(conn, {"type": "end"})
    print(f"Sent {len(epochs)} epochs, then 'end'.")


def main():
    ap = argparse.ArgumentParser(description="Two-box design: the Sensor Box.")
    ap.add_argument("--source", choices=["synthetic", "replay", "ironbci"],
                    default="synthetic")
    ap.add_argument("--host", default="127.0.0.1",
                    help="bind address. 127.0.0.1 = this Xavier only (default); "
                         "0.0.0.0 = reachable from the other machine.")
    ap.add_argument("--port", type=int, default=9000)
    ap.add_argument("--rate", type=float, default=0.0,
                    help="epochs/sec to throttle to (0 = as fast as possible)")
    # shared shape / labeling knobs
    ap.add_argument("--classes", default="rest,move", help="comma-separated names")
    ap.add_argument("--per-class", type=int, default=40)
    ap.add_argument("--channels", type=int, default=3, help="synthetic only")
    ap.add_argument("--n-times", type=int, default=1024, help="synthetic only")
    ap.add_argument("--seed", type=int, default=0, help="synthetic only")
    # replay
    ap.add_argument("--npz", help="recording to replay (--source replay)")
    # ironbci
    ap.add_argument("--serial-port", help="e.g. /dev/ttyACM0 (--source ironbci)")
    ap.add_argument("--clip-sec", type=float, default=2.0)
    ap.add_argument("--prep-sec", type=float, default=2.0)
    ap.add_argument("--bandpass", default="4,38", help="'lo,hi' Hz or 'none'")
    args = ap.parse_args()

    classes = [c.strip() for c in args.classes.split(",")]

    if args.source == "synthetic":
        meta, epochs = source_synthetic(classes, args.per_class,
                                        args.channels, args.n_times, args.seed)
    elif args.source == "replay":
        if not args.npz:
            ap.error("--source replay requires --npz PATH")
        meta, epochs = source_replay(args.npz)
    else:
        if not args.serial_port:
            ap.error("--source ironbci requires --serial-port")
        band = None
        if args.bandpass.lower() != "none":
            lo, hi = (float(v) for v in args.bandpass.split(","))
            band = (lo, hi)
        meta, epochs = source_ironbci(args.serial_port, classes, args.per_class,
                                      args.clip_sec, args.prep_sec, band)

    if not epochs:
        print("No epochs to send — nothing recorded.")
        return

    where = "this Xavier only" if args.host in ("127.0.0.1", "localhost") \
        else "any machine on the network"
    print(f"Sensor Box ready: {len(epochs)} epochs, {len(meta['classes'])} "
          f"classes, sfreq={meta['sfreq']:.0f}Hz.")
    print(f"Listening on {args.host}:{args.port}  ({where}). Waiting for a "
          f"Compute Box…")

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind((args.host, args.port))
        srv.listen(1)
        conn, addr = srv.accept()
        with conn:
            print(f"Compute Box connected from {addr[0]}:{addr[1]}.")
            serve(conn, args.source, meta, epochs, args.rate)


if __name__ == "__main__":
    main()
