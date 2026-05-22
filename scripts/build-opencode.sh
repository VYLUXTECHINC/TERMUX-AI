#!/usr/bin/env bash
# Build standalone binary for Android aarch64
#
# Usage: ./scripts/build-opencode.sh
#
# Requires:
# - Android Bun binary built (scripts/build-bun.sh)
# - libopentui.so built (scripts/build-opentui.sh)
# - Host Bun installed (for bundling)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

HOST_BUN="${HOST_BUN:-bun}"

APP_NAME="${APP_NAME:-opencode}"
APP_BINARY="${APP_BINARY:-opencode}"
APP_IDENTITY="${APP_IDENTITY:-}"
APP_VERSION="${APP_VERSION:-1.0.0}"

echo "=== Building ${APP_NAME} v${APP_VERSION} for Android aarch64 ==="

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

# ---- Apply custom endpoint configuration ----
echo ">>> Applying custom endpoint configuration..."
cd "$OPENCODE_PKG"

bash "$REPO_ROOT/patches/opencode/vylux-sed.sh"

echo ">>> Copying models snapshot..."
cp "$REPO_ROOT/patches/opencode/vylux-models.json" "$OPENCODE_PKG/vylux-models.json"

# ---- Inject Custom Provider ----
echo ">>> Injecting custom provider..."
cp "$REPO_ROOT/patches/opencode/vylux-provider.ts" "$OPENCODE_PKG/src/provider/vylux-provider.ts"

python3 -c "
import re

with open('$OPENCODE_PKG/src/provider/provider.ts', 'r') as f:
    content = f.read()

content = content.replace(
    'import { ModelID, ProviderID } from \"./schema\"',
    'import { ModelID, ProviderID } from \"./schema\"\nimport { createVyluxProvider } from \"./vylux-provider\"'
)

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
print('Custom provider injected')
"

# Find Android bun binary
ANDROID_BUN="$BUN_BUILD/bun"
if [ ! -f "$ANDROID_BUN" ]; then
    echo "ERROR: Android bun not found at $ANDROID_BUN — run scripts/build-bun.sh first."
    exit 1
fi

# Find ARM64 libopentui.so
ARM64_LIBOPENTUI="$OPENTUI_SRC/packages/core/src/lib/aarch64-linux-android/libopentui.so"
if [ ! -f "$ARM64_LIBOPENTUI" ]; then
    echo "ERROR: ARM64 libopentui.so not found — run scripts/build-opentui.sh first."
    exit 1
fi

# Find and swap libopentui.so
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
    echo ">>> Swapping libopentui.so x86_64 -> ARM64..."
    BACKUP_FILE="${OPENTUI_NODE_MODULE}.x64.bak"
    cp "$OPENTUI_NODE_MODULE" "$BACKUP_FILE"
    cp "$ARM64_LIBOPENTUI" "$OPENTUI_NODE_MODULE"
fi

mkdir -p "$DIST_DIR"

echo ">>> Building standalone binary..."
BUILD_SCRIPT="$REPO_ROOT/scripts/build-opencode-android.ts"
BUILD_SCRIPT_LOCAL="$OPENCODE_PKG/build-opencode-android.ts"
cp "$BUILD_SCRIPT" "$BUILD_SCRIPT_LOCAL"
cd "$OPENCODE_PKG"

APP_NAME="$APP_NAME" \
APP_BINARY="$APP_BINARY" \
APP_IDENTITY="$APP_IDENTITY" \
APP_VERSION="$APP_VERSION" \
APP_MODELS_JSON="$OPENCODE_PKG/vylux-models.json" \
    ANDROID_BUN="$ANDROID_BUN" \
    OUTPUT_DIR="$DIST_DIR" \
    OPENCODE_DIR="$OPENCODE_PKG" \
    "$HOST_BUN" run "$BUILD_SCRIPT_LOCAL"

rm -f "$BUILD_SCRIPT_LOCAL" "$OPENCODE_PKG/vylux-models.json"

if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
    mv "$BACKUP_FILE" "$OPENTUI_NODE_MODULE"
fi

BINARY_PATH="$DIST_DIR/$APP_BINARY"
if [ ! -f "$BINARY_PATH" ]; then
    echo "ERROR: Binary not found at $BINARY_PATH"
    exit 1
fi

echo ""
echo "=== Build complete ==="
echo "Binary: $BINARY_PATH"
echo "Size: $(du -h "$BINARY_PATH" | cut -f1)"
file "$BINARY_PATH"
