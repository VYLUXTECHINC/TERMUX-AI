#!/usr/bin/env bash
# Create distribution packages for VYLUX AI Android
#
# Usage: ./scripts/make-packages.sh
#
# Creates three package formats:
# 1. ZIP: vylux-${VERSION}-android-aarch64.zip (standalone binary)
# 2. Pacman: vylux-${VERSION}-1-aarch64.pkg.tar.xz (Termux pacman format)
# 3. Deb: vylux_${VERSION}_aarch64.deb (old Termux deb format)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

VYLUX_BINARY_PATH="$DIST_DIR/$VYLUX_BINARY"
PKG_DIR="$WORK_DIR/packages"

if [ ! -f "$VYLUX_BINARY_PATH" ]; then
    echo "ERROR: ${VYLUX_NAME} binary not found at $VYLUX_BINARY_PATH"
    echo "       Run scripts/build-opencode.sh first."
    exit 1
fi

echo "=== Creating packages for ${VYLUX_NAME} AI v${VYLUX_VERSION} ==="

BINARY_SIZE=$(stat -c%s "$VYLUX_BINARY_PATH")
BUILD_DATE=$(date +%s)

# Clean up
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"

# ==========================================
# 1. ZIP package
# ==========================================
echo ">>> Creating ZIP package..."
ZIP_NAME="${VYLUX_BINARY}-${VYLUX_VERSION}-android-aarch64.zip"
cd "$DIST_DIR"
zip -9 "$PKG_DIR/$ZIP_NAME" "$VYLUX_BINARY"
echo "    Created $ZIP_NAME"

# ==========================================
# 2. Pacman package (Termux)
# ==========================================
echo ">>> Creating pacman package..."
PACMAN_STAGING="$PKG_DIR/pacman-staging"
mkdir -p "$PACMAN_STAGING/data/data/com.termux/files/usr/bin"

cp "$VYLUX_BINARY_PATH" "$PACMAN_STAGING/data/data/com.termux/files/usr/bin/$VYLUX_BINARY"
chmod 755 "$PACMAN_STAGING/data/data/com.termux/files/usr/bin/$VYLUX_BINARY"

# Create .PKGINFO
cat > "$PACMAN_STAGING/.PKGINFO" << EOF
pkgname = ${VYLUX_BINARY}
pkgver = ${VYLUX_VERSION}-1
pkgdesc = ${VYLUX_NAME} AI - Terminal AI coding assistant by VYLUX TECH
url = https://github.com/VYLUX-TECH/vylux-termux
builddate = ${BUILD_DATE}
packager = VYLUX-TECH
size = ${BINARY_SIZE}
arch = aarch64
license = MIT
depend = ripgrep
EOF

PACMAN_NAME="${VYLUX_BINARY}-${VYLUX_VERSION}-1-aarch64.pkg.tar.xz"
cd "$PACMAN_STAGING"
tar cf - .PKGINFO data | xz -9 > "$PKG_DIR/$PACMAN_NAME"
echo "    Created $PACMAN_NAME"

# ==========================================
# 3. Deb package (old Termux format)
# ==========================================
echo ">>> Creating deb package..."
DEB_STAGING="$PKG_DIR/deb-staging"
mkdir -p "$DEB_STAGING/data/data/data/com.termux/files/usr/bin"
mkdir -p "$DEB_STAGING/DEBIAN"

cp "$VYLUX_BINARY_PATH" "$DEB_STAGING/data/data/data/com.termux/files/usr/bin/$VYLUX_BINARY"
chmod 755 "$DEB_STAGING/data/data/data/com.termux/files/usr/bin/$VYLUX_BINARY"

# Create control file
INSTALLED_SIZE=$((BINARY_SIZE / 1024))
cat > "$DEB_STAGING/DEBIAN/control" << EOF
Package: ${VYLUX_BINARY}
Version: ${VYLUX_VERSION}
Architecture: aarch64
Maintainer: VYLUX TECH
Installed-Size: ${INSTALLED_SIZE}
Depends: ripgrep
Section: utils
Priority: optional
Homepage: https://github.com/VYLUX-TECH/vylux-termux
Description: ${VYLUX_NAME} AI - Terminal AI coding assistant by VYLUX TECH
 ${VYLUX_NAME} AI is a terminal AI coding assistant for Android/Termux.
 Powered by DeepSeek and Gemini through the VYLUX endpoint.
EOF

DEB_NAME="${VYLUX_BINARY}_${VYLUX_VERSION}_aarch64.deb"

# Build deb manually (dpkg-deb may not be available)
cd "$DEB_STAGING/data"
tar czf "$DEB_STAGING/data.tar.gz" data
cd "$DEB_STAGING/DEBIAN"
tar czf "$DEB_STAGING/control.tar.gz" control
echo "2.0" > "$DEB_STAGING/debian-binary"
cd "$DEB_STAGING"
ar rc "$PKG_DIR/$DEB_NAME" debian-binary control.tar.gz data.tar.gz
echo "    Created $DEB_NAME"

# ==========================================
# Summary
# ==========================================
echo ""
echo "=== Packages created ==="
echo ""
ls -lh "$PKG_DIR"/*.{zip,xz,deb} 2>/dev/null
echo ""
echo "Install on Termux:"
echo "  pacman -U $PACMAN_NAME"
echo "  dpkg -i $DEB_NAME"
echo "  unzip $ZIP_NAME -d /data/data/com.termux/files/usr/bin/"
