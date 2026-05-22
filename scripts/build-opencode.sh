#!/usr/bin/env bash
# Build VYLUX AI standalone binary for Android aarch64
#
# Usage: ./scripts/build-opencode.sh
#
# This script:
# 1. Clones upstream source if needed
# 2. Applies VYLUX rebranding patches
# 3. Swaps x86_64 libopentui.so with ARM64 version
# 4. Runs the TypeScript build script to create the standalone binary
# 5. Restores original libopentui.so
#
# Requires:
# - Android Bun binary built (scripts/build-bun.sh)
# - libopentui.so built (scripts/build-opentui.sh)
# - Host Bun installed (for bundling)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

HOST_BUN="${HOST_BUN:-bun}"

echo "=== Building ${VYLUX_NAME} AI v${VYLUX_VERSION} for Android aarch64 ==="

# Clone upstream source
if [ ! -d "$OPENCODE_SRC/.git" ]; then
    echo ">>> Cloning source v${OPENCODE_VERSION}..."
    git clone --depth 1 --branch "v${OPENCODE_VERSION}" https://github.com/anomalyco/opencode.git "$OPENCODE_SRC"
else
    echo ">>> Source exists at $OPENCODE_SRC"
fi

OPENCODE_PKG="$OPENCODE_SRC/packages/opencode"

# Install dependencies
echo ">>> Installing dependencies..."
cd "$OPENCODE_SRC"
"$HOST_BUN" install

# ---- VYLUX Rebranding ----
echo ">>> Applying VYLUX rebranding patches..."
cd "$OPENCODE_PKG"

# Run the sed-based rebranding script
bash "$REPO_ROOT/patches/opencode/vylux-sed.sh"

# Copy custom models snapshot
echo ">>> Copying VYLUX models snapshot..."
cp "$REPO_ROOT/patches/opencode/vylux-models.json" "$OPENCODE_PKG/vylux-models.json"

# ---- Inject Custom VYLUX Provider ----
# The endpoint uses GET /?query=...&model=... (not OpenAI-compatible)
echo ">>> Injecting custom VYLUX provider..."
cp "$REPO_ROOT/patches/opencode/vylux-provider.ts" "$OPENCODE_PKG/src/provider/vylux-provider.ts"

python3 -c "
import re

with open('$OPENCODE_PKG/src/provider/provider.ts', 'r') as f:
    content = f.read()

# Add import after ModelID/ProviderID import
content = content.replace(
    'import { ModelID, ProviderID } from \"./schema\"',
    'import { ModelID, ProviderID } from \"./schema\"\nimport { createVyluxProvider } from \"./vylux-provider\"'
)

# Add custom loader entry before 'kilo:' 
old = '    kilo: async () => {'
new = '''    vylux: async () => {
      return {
        autoload: true,
        getModel: async (_sdk: any, modelID: string) => {
          return createVyluxProvider({}).languageModel(modelID)
        },
      }
    },
    kilo: async () => {'''
content = content.replace(old, new)

with open('$OPENCODE_PKG/src/provider/provider.ts', 'w') as f:
    f.write(content)
print('Custom provider injected successfully')
"

# Find the Android bun binary
ANDROID_BUN="$BUN_BUILD/bun"
if [ ! -f "$ANDROID_BUN" ]; then
    echo "ERROR: Android bun binary not found at $ANDROID_BUN"
    echo "       Run scripts/build-bun.sh first."
    exit 1
fi

# Find ARM64 libopentui.so
ARM64_LIBOPENTUI="$OPENTUI_SRC/packages/core/src/lib/aarch64-linux-android/libopentui.so"
if [ ! -f "$ARM64_LIBOPENTUI" ]; then
    echo "ERROR: ARM64 libopentui.so not found at $ARM64_LIBOPENTUI"
    echo "       Run scripts/build-opentui.sh first."
    exit 1
fi

# Find x86_64 libopentui.so in node_modules and swap it
OPENTUI_NODE_MODULE=""
for candidate in \
    "$OPENCODE_SRC/node_modules/@opentui/core-linux-x64/libopentui.so" \
    "$OPENCODE_PKG/node_modules/@opentui/core-linux-x64/libopentui.so" \
    "$OPENCODE_SRC/node_modules/.bun/@opentui+core-linux-x64@*/node_modules/@opentui/core-linux-x64/libopentui.so"
do
    for f in $candidate; do
        if [ -f "$f" ]; then
            OPENTUI_NODE_MODULE="$f"
            break 2
        fi
    done
done

BACKUP_FILE=""
if [ -n "$OPENTUI_NODE_MODULE" ]; then
    echo ">>> Swapping x86_64 libopentui.so with ARM64 version..."
    BACKUP_FILE="${OPENTUI_NODE_MODULE}.x64.bak"
    cp "$OPENTUI_NODE_MODULE" "$BACKUP_FILE"
    cp "$ARM64_LIBOPENTUI" "$OPENTUI_NODE_MODULE"
    echo "    Backed up to $BACKUP_FILE"
else
    echo "WARNING: Could not find x86_64 libopentui.so in node_modules"
    echo "         The build may embed the wrong architecture"
fi

# Create dist directory
mkdir -p "$DIST_DIR"

# Run the TypeScript build script
echo ">>> Building ${VYLUX_NAME} AI standalone binary..."
BUILD_SCRIPT="$REPO_ROOT/scripts/build-opencode-android.ts"
BUILD_SCRIPT_LOCAL="$OPENCODE_PKG/build-opencode-android.ts"
cp "$BUILD_SCRIPT" "$BUILD_SCRIPT_LOCAL"
cd "$OPENCODE_PKG"

VYLUX_VERSION="$VYLUX_VERSION" \
VYLUX_NAME="$VYLUX_NAME" \
VYLUX_BINARY="$VYLUX_BINARY" \
VYLUX_IDENTITY="$VYLUX_IDENTITY" \
VYLUX_MODELS_JSON="$OPENCODE_PKG/vylux-models.json" \
    ANDROID_BUN="$ANDROID_BUN" \
    OUTPUT_DIR="$DIST_DIR" \
    OPENCODE_DIR="$OPENCODE_PKG" \
    "$HOST_BUN" run "$BUILD_SCRIPT_LOCAL"

# Clean up copied script and models
rm -f "$BUILD_SCRIPT_LOCAL"
rm -f "$OPENCODE_PKG/vylux-models.json"

# Restore original libopentui.so
if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
    echo ">>> Restoring original x86_64 libopentui.so..."
    mv "$BACKUP_FILE" "$OPENTUI_NODE_MODULE"
fi

# Verify output
VYLUX_BINARY_PATH="$DIST_DIR/$VYLUX_BINARY"
if [ ! -f "$VYLUX_BINARY_PATH" ]; then
    echo "ERROR: ${VYLUX_NAME} binary not found at $VYLUX_BINARY_PATH"
    exit 1
fi

echo ""
echo "=== ${VYLUX_NAME} AI build complete ==="
echo "Binary: $VYLUX_BINARY_PATH"
echo "Size: $(du -h "$VYLUX_BINARY_PATH" | cut -f1)"
file "$VYLUX_BINARY_PATH"
