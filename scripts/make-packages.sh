#!/usr/bin/env bash
# Create distribution packages
#
# Usage: ./scripts/make-packages.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

APP_NAME="${APP_NAME:-opencode}"
APP_BINARY="${APP_BINARY:-opencode}"
APP_VERSION="${APP_VERSION:-1.0.0}"

BINARY_PATH="$DIST_DIR/$APP_BINARY"
PKG_DIR="$WORK_DIR/packages"

if [ ! -f "$BINARY_PATH" ]; then
    echo "ERROR: Binary not found at $BINARY_PATH"
    echo "       Run scripts/build-opencode.sh first."
    exit 1
fi

echo "=== Creating packages for ${APP_NAME} v${APP_VERSION} ==="

BINARY_SIZE=$(stat -c%s "$BINARY_PATH")
BUILD_DATE=$(date +%s)

rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"

# 1. ZIP
echo ">>> Creating ZIP package..."
ZIP_NAME="${APP_BINARY}-${APP_VERSION}-android-aarch64.zip"
cd "$DIST_DIR"
zip -9 "$PKG_DIR/$ZIP_NAME" "$APP_BINARY"
echo "    Created $ZIP_NAME"

# 2. Pacman
echo ">>> Creating pacman package..."
PACMAN_STAGING="$PKG_DIR/pacman-staging"
mkdir -p "$PACMAN_STAGING/data/data/com.termux/files/usr/bin"
cp "$BINARY_PATH" "$PACMAN_STAGING/data/data/com.termux/files/usr/bin/$APP_BINARY"
chmod 755 "$PACMAN_STAGING/data/data/com.termux/files/usr/bin/$APP_BINARY"

cat > "$PACMAN_STAGING/.PKGINFO" << EOF
pkgname = ${APP_BINARY}
pkgver = ${APP_VERSION}-1
pkgdesc = ${APP_NAME} - Terminal AI coding assistant
url = https://github.com/VYLUXTECHINC/TERMUX-AI
builddate = ${BUILD_DATE}
packager = VYLUXTECHINC
size = ${BINARY_SIZE}
arch = aarch64
license = MIT
EOF

PACMAN_NAME="${APP_BINARY}-${APP_VERSION}-1-aarch64.pkg.tar.xz"
cd "$PACMAN_STAGING"
tar cf - .PKGINFO data | xz -9 > "$PKG_DIR/$PACMAN_NAME"
echo "    Created $PACMAN_NAME"

# 3. Deb
echo ">>> Creating deb package..."
DEB_STAGING="$PKG_DIR/deb-staging"
mkdir -p "$DEB_STAGING/data/data/data/com.termux/files/usr/bin"
mkdir -p "$DEB_STAGING/DEBIAN"
cp "$BINARY_PATH" "$DEB_STAGING/data/data/data/com.termux/files/usr/bin/$APP_BINARY"
chmod 755 "$DEB_STAGING/data/data/data/com.termux/files/usr/bin/$APP_BINARY"

INSTALLED_SIZE=$((BINARY_SIZE / 1024))
cat > "$DEB_STAGING/DEBIAN/control" << EOF
Package: ${APP_BINARY}
Version: ${APP_VERSION}
Architecture: aarch64
Maintainer: VYLUX TECH
Installed-Size: ${INSTALLED_SIZE}
Section: utils
Priority: optional
Homepage: https://github.com/VYLUXTECHINC/TERMUX-AI
Description: ${APP_NAME} - Terminal AI coding assistant
EOF

DEB_NAME="${APP_BINARY}_${APP_VERSION}_aarch64.deb"
cd "$DEB_STAGING/data"
tar czf "$DEB_STAGING/data.tar.gz" data
cd "$DEB_STAGING/DEBIAN"
tar czf "$DEB_STAGING/control.tar.gz" control
echo "2.0" > "$DEB_STAGING/debian-binary"
cd "$DEB_STAGING"
ar rc "$PKG_DIR/$DEB_NAME" debian-binary control.tar.gz data.tar.gz
echo "    Created $DEB_NAME"

echo ""
echo "=== Packages created ==="
ls -lh "$PKG_DIR"/*.{zip,xz,deb} 2>/dev/null || true
