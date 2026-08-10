# Two-box design — run it

The design is on paper in [`../TWO_BOX_DESIGN.md`](../TWO_BOX_DESIGN.md). This is
how to **run** the two halves. Both run on one Xavier today (over `localhost`);
point them at two machines later by changing one flag.

| File | Box | What it does | Needs |
|------|-----|--------------|-------|
| `protocol.py` | — | the wire contract both boxes import (the seam) | numpy |
| `sensor.py` | **Sensor Box** | acquire/label epochs, stream them over TCP | numpy (+ brainflow for the live board) |
| `compute.py` | **Compute Box** | connect, collect the epochs, train, report accuracy | braindecode, mne, torch |

The Compute Box reuses `train_local.train_model()`, so the two-box path and the
single-file CLI / web app all run the **exact same** training code.

## Both halves on the one Xavier (now)

Two terminals in your Jetson container (see [`../JETSON.md`](../JETSON.md)).

**Terminal 1 — Sensor Box** (defaults to `127.0.0.1:9000` = this Xavier only):

```bash
cd hardware/twobox
python3 sensor.py --source synthetic --classes rest,move --per-class 40
```

**Terminal 2 — Compute Box** (defaults to connecting to `127.0.0.1:9000`):

```bash
cd hardware/twobox
python3 compute.py --model shallow --epochs 25
```

The Sensor Box waits for the Compute Box, streams a `session` header then every
epoch, and ends with `end`. The Compute Box collects them all and trains. On
synthetic data you'll see accuracy well above chance in a few seconds.

### Sensor Box sources

| `--source` | Needs hardware? | Use it for |
|---|---|---|
| `synthetic` | no | confirm the whole loop instantly, no network, no board |
| `replay --npz FILE` | no | stream a real recording saved by `ironbci32_stream.py` |
| `ironbci --serial-port /dev/ttyACM0` | **yes** | record live from the IronBCI-32 (**battery only!**) |

```bash
# replay a saved recording to the Compute Box
python3 sensor.py --source replay --npz session1.npz

# live from the board — battery only, electrodes on a head
python3 sensor.py --source ironbci --serial-port /dev/ttyACM0 \
    --classes left,right --per-class 20
```

## Two machines (later)

When the second machine is ready, **no code changes** — only addresses:

**On the Sensor Box machine** — open the bind so the network can reach it:

```bash
python3 sensor.py --source ironbci --serial-port /dev/ttyACM0 --host 0.0.0.0
```

**On the Compute Box machine** — point at the Sensor Box's IP:

```bash
python3 compute.py --host 192.168.1.50 --model eegnet --epochs 40
```

Find the Sensor Box's IP with `hostname -I`. Same `--port` on both (default 9000).

## Notes

- **One consumer per session.** The Sensor Box serves a single Compute Box, then
  exits — matching a record-a-session-then-train workflow. Restart it for the
  next session.
- **`--rate`** throttles the Sensor Box to N epochs/sec (default: as fast as
  possible) if you want to simulate real-time pacing over the wire.
- **Safety:** with a real IronBCI-32 on a head, the Sensor Box and everything
  wired to it run on **battery, never mains**. That rule lives with the Sensor
  Box. Not a medical device; learning/research only.
