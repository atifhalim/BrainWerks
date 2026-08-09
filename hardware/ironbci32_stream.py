#!/usr/bin/env python3
"""
ironbci32_stream.py — acquire EEG from the PiEEG IronBCI-32 via BrainFlow.

Two modes:
  monitor : print a live per-channel signal level, so you can confirm contact.
  record  : run a cued session and save a labeled dataset (X, y) as an .npz
            you can upload to the BrainWerks training notebook in Colab.

Runs on the Jetson (only needs: brainflow, numpy). No GPU / torch required.

Examples
--------
  # is it alive? (plug the board in on BATTERY first)
  python3 ironbci32_stream.py --serial-port /dev/ttyACM0 --mode monitor

  # record 20 clips each of "left" vs "right", 2 s each, band-passed 4-38 Hz
  python3 ironbci32_stream.py --serial-port /dev/ttyACM0 --mode record \\
        --classes left,right --trials-per-class 20 --clip-sec 2 --out session1.npz

Safety: run everything on battery. Never plug the Jetson into mains while
electrodes are on a head.
"""
import argparse
import random
import sys
import time

import numpy as np
from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds
from brainflow.data_filter import DataFilter, FilterTypes

BOARD_ID = BoardIds.IRONBCI_32_BOARD


def connect(serial_port):
    BoardShim.disable_board_logger()
    params = BrainFlowInputParams()
    params.serial_port = serial_port
    board = BoardShim(BOARD_ID, params)
    board.prepare_session()
    board.start_stream()
    eeg = BoardShim.get_eeg_channels(BOARD_ID)
    sfreq = BoardShim.get_sampling_rate(BOARD_ID)
    return board, eeg, sfreq


def bandpass(epoch, sfreq, lo, hi):
    """In-place Butterworth band-pass on each channel row (BrainFlow, no SciPy)."""
    for row in epoch:
        DataFilter.perform_bandpass(row, int(sfreq), float(lo), float(hi),
                                    4, FilterTypes.BUTTERWORTH.value, 0.0)
    return epoch


def monitor(board, eeg, sfreq):
    print(f"Monitoring {len(eeg)} channels @ {sfreq:.0f} Hz. Ctrl+C to stop.\n")
    n = int(sfreq)  # 1 second window
    try:
        while True:
            time.sleep(1.0)
            data = board.get_current_board_data(n)
            if data.shape[1] < n:
                continue
            sig = data[eeg, :]
            rms = np.sqrt(np.mean(sig ** 2, axis=1))  # µV RMS per channel
            show = min(len(eeg), 8)
            bars = "  ".join(f"ch{i+1}:{rms[i]:6.1f}" for i in range(show))
            more = "" if len(eeg) <= show else f"  … (+{len(eeg)-show} more)"
            print(f"µV RMS  {bars}{more}")
    except KeyboardInterrupt:
        print("\nstopped.")


def record(board, eeg, sfreq, classes, per_class, clip_sec, prep_sec, band):
    n_times = int(clip_sec * sfreq)
    trials = [c for c in classes for _ in range(per_class)]
    random.shuffle(trials)
    X, y = [], []
    print(f"\nRecording {len(trials)} clips ({per_class} per class), "
          f"{clip_sec:.1f}s each, {len(eeg)} channels @ {sfreq:.0f} Hz.")
    print("Get comfortable. Follow each CUE.\n")
    time.sleep(2)
    try:
        for k, label in enumerate(trials, 1):
            for s in range(int(prep_sec), 0, -1):
                print(f"  [{k}/{len(trials)}] get ready… {s}", end="\r"); time.sleep(1)
            print(f"  [{k}/{len(trials)}]  CUE ►  {label.upper():<10}"
                  f"  (hold {clip_sec:.0f}s)         ")
            board.get_board_data()          # flush old samples
            time.sleep(clip_sec)
            data = board.get_current_board_data(n_times)
            if data.shape[1] < n_times:
                print("   ! short read, skipping this clip"); continue
            epoch = data[eeg, :n_times].astype("float64")   # (channels, time), µV
            if band:
                epoch = bandpass(epoch, sfreq, band[0], band[1])
            X.append(epoch.astype("float32")); y.append(classes.index(label))
        print("\nDone recording.")
    except KeyboardInterrupt:
        print("\ninterrupted — saving what we have.")
    return np.array(X), np.array(y, dtype="int64")


def main():
    ap = argparse.ArgumentParser(description="IronBCI-32 acquisition via BrainFlow")
    ap.add_argument("--serial-port", required=True, help="e.g. /dev/ttyACM0")
    ap.add_argument("--mode", choices=["monitor", "record"], default="monitor")
    ap.add_argument("--classes", default="left,right", help="comma-separated class names")
    ap.add_argument("--trials-per-class", type=int, default=20)
    ap.add_argument("--clip-sec", type=float, default=2.0)
    ap.add_argument("--prep-sec", type=float, default=2.0, help="countdown before each cue")
    ap.add_argument("--bandpass", default="4,38", help="'lo,hi' Hz, or 'none' to disable")
    ap.add_argument("--out", default="session.npz")
    args = ap.parse_args()

    band = None
    if args.bandpass.lower() != "none":
        lo, hi = (float(v) for v in args.bandpass.split(","))
        band = (lo, hi)

    board, eeg, sfreq = connect(args.serial_port)
    try:
        if args.mode == "monitor":
            monitor(board, eeg, sfreq)
        else:
            classes = [c.strip() for c in args.classes.split(",")]
            ch_names = [f"ch{i+1}" for i in range(len(eeg))]
            X, y = record(board, eeg, sfreq, classes, args.trials_per_class,
                          args.clip_sec, args.prep_sec, band)
            if len(X) == 0:
                print("No clips recorded — nothing saved."); return
            np.savez_compressed(args.out, X=X, y=y, classes=np.array(classes),
                                sfreq=float(sfreq), ch_names=np.array(ch_names),
                                units="microvolts")
            print(f"\nSaved {X.shape[0]} clips  X={X.shape}  y={y.shape}  ->  {args.out}")
            print("Upload this .npz to the BrainWerks training notebook to train on it.")
    finally:
        board.stop_stream()
        board.release_session()


if __name__ == "__main__":
    sys.exit(main())
