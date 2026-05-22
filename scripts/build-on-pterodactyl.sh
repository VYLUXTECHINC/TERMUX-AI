#!/usr/bin/env bash
# VYLUX AI Builder for Pterodactyl
# Upload this to your Pterodactyl server, then run:
#   bash build-vylux.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║     VYLUX AI Builder v1.0           ║"
echo "  ║  Built for Pterodactyl              ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Install dependencies
echo -e "${GREEN}[1/6] Installing build dependencies...${NC}"
apt-get update -qq
apt-get install -y -qq curl wget unzip xz-utils cmake ninja-build \
  python3 pkg-config git build-essential libssl-dev libffi-dev \
  patchelf file bc

# Step 2: Download Android NDK r28b
NDK_VERSION="r28b"
NDK_DIR="/opt/android-ndk"
if [ ! -f "$NDK_DIR/ndk-build" ]; then
  echo -e "${GREEN}[2/6] Downloading Android NDK ${NDK_VERSION}...${NC}"
  mkdir -p /opt
  cd /tmp
  wget -q --show-progress \
    "https://dl.google.com/android/repository/android-ndk-${NDK_VERSION}-linux.zip" \
    -O ndk.zip
  echo -e "${GREEN}  Extracting NDK...${NC}"
  unzip -q ndk.zip -d /opt/
  mv /opt/android-ndk-${NDK_VERSION} $NDK_DIR
  rm ndk.zip
  echo -e "${GREEN}  NDK installed to $NDK_DIR${NC}"
else
  echo -e "${GREEN}[2/6] NDK already present${NC}"
fi

export ANDROID_NDK_HOME=$NDK_DIR
export NDK=$NDK_DIR

# Step 3: Set up Android toolchain
echo -e "${GREEN}[3/6] Setting up Android toolchain...${NC}"
TOOLCHAIN_DIR="$NDK/toolchains/llvm/prebuilt/linux-x86_64"
export PATH="$TOOLCHAIN_DIR/bin:$PATH"
export AR="$TOOLCHAIN_DIR/bin/llvm-ar"
export CC="$TOOLCHAIN_DIR/bin/aarch64-linux-android24-clang"
export CXX="$TOOLCHAIN_DIR/bin/aarch64-linux-android24-clang++"
export LD="$TOOLCHAIN_DIR/bin/ld"
export STRIP="$TOOLCHAIN_DIR/bin/llvm-strip"

# Verify toolchain
echo -e "  Using: $(aarch64-linux-android24-clang --version | head -1)"

# Step 4: Clone the repo
BUILD_DIR="/home/container/vylux-build"
if [ ! -d "$BUILD_DIR" ]; then
  echo -e "${GREEN}[4/6] Cloning TERMUX-AI repo...${NC}"
  git clone --branch "${VYLUX_BRANCH:-main}" https://github.com/VYLUXTECHINC/TERMUX-AI.git "$BUILD_DIR"
else
  echo -e "${GREEN}[4/6] Updating TERMUX-AI repo...${NC}"
  cd "$BUILD_DIR" && git pull
fi

cd "$BUILD_DIR"

# Step 5: Build
echo -e "${GREEN}[5/6] Building VYLUX AI...${NC}"
source scripts/env.sh
./scripts/build-opencode.sh 2>&1 | tee /tmp/vylux-build.log

# Step 6: Copy output
echo -e "${GREEN}[6/6] Copying build artifacts...${NC}"
OUTPUT_DIR="/home/container/output"
mkdir -p "$OUTPUT_DIR"

# Find the built binary
if [ -f "build/dist/vylux" ]; then
  cp "build/dist/vylux" "$OUTPUT_DIR/vylux"
  echo -e "${GREEN}  ✓ Binary: $OUTPUT_DIR/vylux${NC}"
fi

# Find any packages
for pkg in build/dist/*.deb build/dist/*.pkg.tar.xz build/dist/*.zip; do
  if [ -f "$pkg" ]; then
    cp "$pkg" "$OUTPUT_DIR/"
    echo -e "${GREEN}  ✓ Package: $(basename $pkg)${NC}"
  fi
done

# Summary
echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════╗"
echo -e "${CYAN}  ║         BUILD COMPLETE               ║"
echo -e "${CYAN}  ╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Download your files from the File Manager:${NC}"
echo -e "  ${CYAN}  /home/container/output/${NC}"
echo ""
ls -lh "$OUTPUT_DIR/" 2>/dev/null || echo "  No output files found"
echo ""

# Keep the server alive if needed
if [ "${VYLUX_SERVE:-false}" = "true" ] || [ "${1:-}" = "--serve" ]; then
  echo "  Starting file server on port 8080..."
  cd "$OUTPUT_DIR"
  python3 -m http.server 8080
fi
