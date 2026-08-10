# Running BrainWerks on the Jetson (Xavier NX 8GB)

This is the exact, copy-paste recipe for training braindecode models on the
Jetson inside a GPU-ready container. Follow it top to bottom the first time.
After you "bake your own image" (below), your daily startup is a **single
command** — no reinstalling anything.

> **Safety:** when a real IronBCI-32 headset is connected to a person, the
> Jetson and everything wired to it **must run on battery** — never plugged
> into mains. The steps here use public sample data, so no board is needed yet.

---

## 0. One-time: keep your scripts in a folder that survives

Make a working folder on the Jetson and put the training script there:

```bash
mkdir -p ~/bci && cd ~/bci
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf   # fix Jetson DNS
wget -O /tmp/tl.py https://raw.githubusercontent.com/atifhalim/BrainWerks/main/hardware/train_local.py && cp /tmp/tl.py train_local.py
```

Why the two-step `wget … && cp`: if the download fails (bad DNS), `wget -O`
would leave an **empty** file and the script would silently do nothing. Writing
to a temp file first, then copying, means you only overwrite `train_local.py`
when the download actually worked.

---

## 1. First run: start the container and install the EEG libraries

The `dustynv/l4t-pytorch` image already has a GPU-enabled PyTorch built for the
Jetson. We add the EEG libraries (braindecode + mne) on top.

Start the container (this maps `~/bci` on the Jetson to `/work` inside it):

```bash
sudo docker run --runtime nvidia -it --rm --network host --dns 8.8.8.8 \
    -v ~/bci:/work -w /work dustynv/l4t-pytorch:latest
```

You are now **inside** the container. Install the libraries (the HDF5 lines are
required or the `h5py` build — a dependency of mne — fails):

```bash
apt-get update && apt-get install -y libhdf5-dev pkg-config
export HDF5_DIR=/usr/lib/aarch64-linux-gnu/hdf5/serial
pip install braindecode mne scikit-learn
```

Check the GPU is visible (should print `CUDA: True`):

```bash
python3 -c "import torch; print(torch.__version__, 'CUDA:', torch.cuda.is_available())"
```

---

## 2. Train — confirm it works

Still inside the container:

```bash
CUDA_VISIBLE_DEVICES="" python3 train_local.py --source eegbci --model shallow --epochs 25
```

You should see it download a small sample once, then finish with something like
`TEST ACCURACY = 66.7%   (chance = 50%)`. Anything above chance means the model
learned. 🎉

**Why `CUDA_VISIBLE_DEVICES=""` (i.e. run on CPU)?** The Xavier NX shares one
8GB pool between CPU and GPU. These EEG models are tiny, so the CPU finishes
them almost instantly, and forcing CPU avoids the `CUDA out of memory` error
that happens when the desktop/browser is already using the shared RAM. Save the
GPU for genuinely large models.

---

## 3. Bake your own image (do this so you never repeat step 1)

Everything you installed lives only in the **running** container, and `--rm`
throws it away on exit. Snapshot it into your own reusable image.

**Leave the container running.** Open a **second** terminal on the Jetson:

```bash
sudo docker ps                                        # copy the CONTAINER ID
sudo docker commit <CONTAINER_ID> brainwerks-jetson:latest
sudo docker images | grep brainwerks                  # confirm it saved
```

Think of it like freezing a ready-to-heat meal instead of cooking from raw
ingredients every time.

---

## 4. Daily startup — one command, from now on

Next time, skip all the installing. Just launch **your** image:

```bash
sudo docker run --runtime nvidia -it --rm --network host --dns 8.8.8.8 \
    -v ~/bci:/work -w /work brainwerks-jetson:latest
```

Then train:

```bash
CUDA_VISIBLE_DEVICES="" python3 train_local.py --source eegbci --model shallow --epochs 25
```

Because `~/bci` is mapped to `/work`, your scripts and recordings live on the
Jetson and survive even with `--rm`. Keep everything in `~/bci`.

---

## 5. Later: train on your own headset recordings

Once the IronBCI-32 arrives, record a labeled session (on battery!) and train on
it — see `README.md` for `ironbci32_stream.py`. In short:

```bash
python3 ironbci32_stream.py --serial-port /dev/ttyACM0 --mode record \
    --classes left,right --trials-per-class 20 --out session1.npz
python3 train_local.py --source npz session1.npz --model eegnet --epochs 40
```

---

## Quick troubleshooting

| Symptom | Fix |
|---|---|
| `wget` hangs / "nothing happens" when running the script | DNS is down. Run `echo "nameserver 8.8.8.8" \| sudo tee /etc/resolv.conf`, then re-download with the temp-file trick in step 0. |
| `h5py` / `libhdf5.so` build error during `pip install` | You skipped the HDF5 lines. Run the two `apt-get` + `export HDF5_DIR=…` lines in step 1, then re-run `pip install`. |
| `CUDA error: out of memory` / `NvMapMemAlloc error 12` | Shared RAM is full. Run with `CUDA_VISIBLE_DEVICES=""` (CPU) as shown, or close the browser/desktop apps. |
| `ModuleNotFoundError: No module named 'mne'` | An earlier `h5py` failure aborted the whole install. Apply the HDF5 fix, then re-run `pip install braindecode mne scikit-learn`. |
