#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup_jetson_ironbci32.sh
# Prepare an NVIDIA Jetson Xavier NX (JetPack 5.1.x / Ubuntu 20.04, aarch64)
# to talk to the PiEEG IronBCI-32 via BrainFlow.
#
#   Run ON THE JETSON:   bash setup_jetson_ironbci32.sh
#   (uses sudo for apt + adding you to the 'dialout' serial group)
# ---------------------------------------------------------------------------
set -euo pipefail

say(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
warn(){ printf "\033[1;33m!! %s\033[0m\n" "$*"; }

# --- 0. sanity: are we on ARM? ---------------------------------------------
ARCH="$(uname -m)"
if [ "$ARCH" != "aarch64" ]; then
  warn "Architecture is '$ARCH', not aarch64. This script is meant for the Jetson."
  warn "Continuing anyway, but BrainFlow will build for whatever this host is."
fi
say "Host: $(. /etc/os-release; echo "$PRETTY_NAME") on $ARCH"

# --- 1. system packages -----------------------------------------------------
say "Installing build tools (git, cmake, g++, python3-dev, pip)…"
sudo apt-get update
sudo apt-get install -y git build-essential cmake g++ python3-pip python3-dev

# A recent CMake from PyPI avoids version issues; put ~/.local/bin on PATH.
say "Ensuring CMake >= 3.16 via pip…"
python3 -m pip install --user --upgrade pip cmake
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
cmake --version | head -1

# --- 2. serial permissions --------------------------------------------------
say "Granting serial-port access (adding $USER to 'dialout')…"
if id -nG "$USER" | grep -qw dialout; then
  echo "already in 'dialout' group."
else
  sudo usermod -aG dialout "$USER"
  warn "Added to 'dialout'. You MUST log out and back in (or reboot) for it to apply."
fi

# --- 3. build BrainFlow from source (no ARM wheels exist) -------------------
BF="$HOME/brainflow"
say "Fetching BrainFlow into $BF …"
if [ -d "$BF/.git" ]; then
  git -C "$BF" pull --ff-only || warn "git pull skipped (local changes?)."
else
  git clone https://github.com/brainflow-dev/brainflow.git "$BF"
fi

say "Compiling the BrainFlow native core (this can take several minutes)…"
cd "$BF"
if [ -f tools/build.sh ]; then
  ( cd tools && bash build.sh )
elif [ -f tools/build.py ]; then
  ( cd tools && python3 build.py )
else
  warn "Could not find tools/build.sh or tools/build.py."
  warn "BrainFlow's layout may have changed — follow the official build doc:"
  warn "  https://brainflow.readthedocs.io/en/stable/BuildBrainFlow.html"
  exit 1
fi

say "Installing the BrainFlow Python binding…"
python3 -m pip install --user -U "$BF/python_package"

# --- 4. verify --------------------------------------------------------------
say "Verifying BrainFlow + IronBCI-32 support…"
python3 - <<'PY'
import sys
try:
    import brainflow
    from brainflow.board_shim import BoardIds
    v = brainflow.__version__
    bid = BoardIds.IRONBCI_32_BOARD
    print(f"BrainFlow version : {v}")
    print(f"IRONBCI_32_BOARD  : {int(bid)}")
    parts = [int(x) for x in v.split('.')[:3]]
    if parts < [5, 20, 1]:
        print("!! WARNING: need BrainFlow >= 5.20.1 for IronBCI-32. Update the repo and re-run.")
    else:
        print("OK: BrainFlow supports the IronBCI-32.")
except Exception as e:
    print("!! BrainFlow check FAILED:", type(e).__name__, e)
    sys.exit(1)
PY

# --- 5. look for the board ---------------------------------------------------
say "Looking for a connected serial device (plug the IronBCI-32 in, on battery)…"
FOUND="$(ls /dev/ttyACM* /dev/ttyUSB* 2>/dev/null || true)"
if [ -n "$FOUND" ]; then
  echo "Found: $FOUND"
else
  warn "No /dev/ttyACM* or /dev/ttyUSB* yet — that's fine if the board isn't plugged in."
fi

# --- done -------------------------------------------------------------------
cat <<EOF

$(say "Setup complete.")
Next:
  1) If you were just added to 'dialout', LOG OUT and back in (or reboot).
  2) Plug in the IronBCI-32 (battery-powered!) and note its port: ls /dev/ttyACM*
  3) Smoke test:
       python3 - <<'PY'
       import time
       from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds
       p = BrainFlowInputParams(); p.serial_port = "/dev/ttyACM0"
       b = BoardShim(BoardIds.IRONBCI_32_BOARD, p)
       b.prepare_session(); b.start_stream(); time.sleep(5); b.stop_stream()
       print("captured:", b.get_board_data().shape); b.release_session()
       PY

  SAFETY: run everything on battery — never plug the Jetson into mains while
  electrodes are on a head.
EOF
