#!/usr/bin/env python3
"""
protocol.py — the wire contract between the Sensor Box and the Compute Box.

This is the *whole* seam of the two-box design. Both halves import this one
file, so neither side has to know anything about the other beyond what's here.
Change the transport (raw TCP today, LSL/ZeroMQ tomorrow) and only this file
moves — sensor.py and compute.py stay put.

Framing (over a plain TCP socket, no extra dependencies):

    ┌──────────────┬──────────────────────┬───────────────────┐
    │ 4 bytes      │ header_len bytes     │ nbytes bytes      │
    │ header_len   │ UTF-8 JSON header    │ raw payload       │
    │ (big-endian) │ (always present)     │ (0 for control)   │
    └──────────────┴──────────────────────┴───────────────────┘

Message types (the "type" field in the JSON header):

  session : sent once, first thing, when a Compute Box connects. Describes the
            recording so the consumer can size its model. No payload.
            fields: sfreq, ch_names, classes, dtype, source
  epoch   : one labeled trial. Payload is the raw array bytes.
            fields: label (int class index), shape [channels, times], dtype
  end     : the sensor is done sending (replay exhausted / session finished).
            No payload.

Only needs: numpy + the standard library. No torch, no brainflow, no braindecode
— so the Sensor Box can import it while staying featherlight.
"""
import json
import socket
import struct

import numpy as np

_LEN = struct.Struct(">I")   # 4-byte big-endian length prefix


def _recvall(sock: socket.socket, n: int) -> bytes | None:
    """Read exactly n bytes, or None if the peer closed the connection first."""
    buf = bytearray()
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None
        buf.extend(chunk)
    return bytes(buf)


def send_msg(sock: socket.socket, header: dict, payload: bytes = b"") -> None:
    """Send one framed message: JSON header + optional raw payload."""
    header = {**header, "nbytes": len(payload)}
    raw = json.dumps(header).encode("utf-8")
    sock.sendall(_LEN.pack(len(raw)) + raw + payload)


def recv_msg(sock: socket.socket):
    """Receive one framed message.

    Returns (header: dict, payload: bytes), or None on a clean close.
    """
    head = _recvall(sock, _LEN.size)
    if head is None:
        return None
    (hlen,) = _LEN.unpack(head)
    raw = _recvall(sock, hlen)
    if raw is None:
        return None
    header = json.loads(raw.decode("utf-8"))
    nbytes = int(header.get("nbytes", 0))
    payload = _recvall(sock, nbytes) if nbytes else b""
    if payload is None:
        return None
    return header, payload


# --- convenience: numpy array <-> epoch message ---------------------------- #
def pack_epoch(arr: np.ndarray, label: int) -> tuple[dict, bytes]:
    """Turn one (channels, times) epoch into a header + payload pair."""
    arr = np.ascontiguousarray(arr)
    header = {"type": "epoch", "label": int(label),
              "shape": list(arr.shape), "dtype": str(arr.dtype)}
    return header, arr.tobytes()


def unpack_epoch(header: dict, payload: bytes) -> tuple[np.ndarray, int]:
    """Rebuild the (array, label) an epoch message carried."""
    arr = np.frombuffer(payload, dtype=header["dtype"]).reshape(header["shape"])
    return arr.copy(), int(header["label"])   # copy: frombuffer is read-only
