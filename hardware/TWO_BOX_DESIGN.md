# The two-box design (on paper)

BrainWerks splits into **two boxes** with **one seam** between them. This page is
the design — the boundary, the contract, and the plan to run both halves on the
one Xavier now and move to two machines later without changing code.

The code that implements it lives in [`twobox/`](twobox/) — start there for how
to *run* it; this page is the *why*.

---

## The two boxes

```
        ┌──────────────────────────┐        ┌──────────────────────────┐
        │       SENSOR BOX         │        │       COMPUTE BOX        │
        │  (near the person)       │        │  (the workstation)       │
        │                          │        │                          │
        │  IronBCI-32 ──USB──▶     │  TCP   │   ──▶ collect epochs     │
        │  acquire + band-pass     │══════▶ │   ──▶ braindecode train  │
        │  cut labeled epochs      │ epochs │   ──▶ report accuracy     │
        │                          │        │                          │
        │  deps: numpy (+brainflow │        │  deps: torch, braindecode │
        │        for the board)    │        │        mne, skorch        │
        │  power: BATTERY ONLY      │        │  power: mains OK          │
        └──────────────────────────┘        └──────────────────────────┘
              produces the stream                consumes the stream
```

| | **Sensor Box** | **Compute Box** |
|---|---|---|
| **Job** | acquire EEG, label it, publish it | subscribe, train, report |
| **Touches the electrodes?** | **yes** | never |
| **Power** | **battery only** (mains isolation) | mains fine |
| **Weight** | featherlight: `numpy` (+ `brainflow` for the real board) | heavy: `torch`, `braindecode`, `mne` |
| **Needs a GPU?** | no | wants one |
| **Fails how?** | a bad electrode = no signal | a bad hyperparameter = low accuracy |

Why split here: the two halves have **opposite constraints**. The Sensor Box
must stay tiny and battery-isolated right next to a person's head; the Compute
Box wants to be a plugged-in GPU workstation. Forcing both onto one machine
means the training box inherits the sensor box's battery-isolation rule, and the
sensor box inherits a multi-gigabyte torch install. Splitting lets each be what
it needs to be.

---

## The seam: one wire contract

The boxes meet at exactly one place — [`twobox/protocol.py`](twobox/protocol.py).
It defines length-prefixed messages over a plain TCP socket (no LSL, ZeroMQ, or
broker to install — in the spirit of the stdlib-only web app):

```
[4-byte length][JSON header][raw payload]
```

Three message types flow **one way**, Sensor → Compute:

| Message | When | Carries |
|---|---|---|
| `session` | once, on connect | `sfreq`, `ch_names`, `classes`, `dtype`, `source` |
| `epoch` | per trial | `label` + the raw `float32` `(channels, times)` array |
| `end` | stream finished | — |

That's the entire boundary. The Sensor Box knows nothing about braindecode; the
Compute Box knows nothing about brainflow. Swap the transport (LSL for live
real-time, say) and **only `protocol.py` changes** — neither box moves.

The epoch shape on the wire — `(channels, times)`, µV, `float32` — is deliberately
the **same array `train_local.py` already trains on**, and the same `.npz`
`ironbci32_stream.py` already saves. The seam introduces no new data format.

---

## One Xavier now → two machines later

The point of the design: **the split is logical, not physical.** Both halves run
as two processes on the single Xavier today, talking over `localhost`. When the
second machine arrives, nothing about the code changes — only an address.

| | **Now (one Xavier)** | **Later (two machines)** |
|---|---|---|
| Sensor Box bind | `--host 127.0.0.1` (default) | `--host 0.0.0.0` |
| Compute Box connect | `--host 127.0.0.1` (default) | `--host <sensor-ip>` |
| Transport | loopback | LAN |
| Code changes | — | **none** |

Running both on the Xavier now isn't a compromise we tolerate — it's the honest
first stage of the same architecture. `localhost` is a real network hop; if the
two processes talk cleanly over loopback today, they talk cleanly over a cable
tomorrow. See [`twobox/README.md`](twobox/README.md) for the exact commands.

---

## Where safety lives

Mains isolation is a property of the **Sensor Box only** — it's the box wired to
a person. Keeping training off that box is part of *why* the split exists: the
Compute Box can stay on mains and lean on the GPU precisely because it never
touches the electrodes. When a real IronBCI-32 is on a head, the Sensor Box (and
anything sharing its power) runs on **battery, never mains**. Not a medical
device; for learning and research only.

---

## What's built vs. what's next

- **Built:** the wire contract; a Sensor Box that streams from `synthetic`,
  `replay` (an `.npz`), or the live `ironbci` board; a Compute Box that collects
  a full session and trains via the existing `train_local.train_model()`.
- **Deliberately not yet:** live *inference* streaming (continuous windows +
  predictions back to the Sensor Box) and a real-time transport like LSL. The
  contract has room for both — they're new message types, not a redesign.
