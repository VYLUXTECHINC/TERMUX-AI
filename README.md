# VYLUX AI for Termux (Android aarch64)

**VYLUX AI made by VYLUX TECH**

Terminal AI coding assistant for Android devices via [Termux](https://termux.dev/). Powered by **DeepSeek** and **Gemini** through the VYLUX endpoint.

## Features

- Full terminal UI (TUI) with prompt, model selector, status bar
- Two AI models: **DeepSeek** and **Gemini** (switch between them)
- Code-aware file editing, globbing, grep, bash execution
- Unlimited usage through the VYLUX endpoint
- Standalone binary, no runtime dependencies beyond `ripgrep`

## Install (Termux)

### Standalone binary

> **Note:** There are no pre-built releases yet. You need to build from source (see [Build](#build) section) or wait for CI releases.

### Standalone binary

```bash
curl -LO https://github.com/VYLUXTECHINC/TERMUX-AI/releases/latest/download/vylux-aarch64.zip
unzip vylux-aarch64.zip
chmod +x vylux
mv vylux $PREFIX/bin/
pkg install ripgrep
vylux
```

### Pacman package

```bash
curl -LO https://github.com/VYLUXTECHINC/TERMUX-AI/releases/latest/download/vylux-aarch64.pkg.tar.xz
pacman -U vylux-*-aarch64.pkg.tar.xz
vylux
```

### Deb package

```bash
curl -LO https://github.com/VYLUXTECHINC/TERMUX-AI/releases/latest/download/vylux-aarch64.deb
dpkg -i vylux-*-aarch64.deb
vylux
```

### After install

No API key needed. VYLUX AI uses the VYLUX endpoint with DeepSeek and Gemini. Just run `vylux` and use the model selector in the TUI to switch between models.

## What This Repo Contains

```
vylux-termux/
  patches/
    bun/android-support.patch         # Bun Android/aarch64 support
    webkit/android-support.patch      # WebKit/JSC Android fixes
    zig/posix-android-sigaction.patch # Zig stdlib Android fix
    opentui/android-libc-link.patch   # Android dlopen fix
    opencode/vylux-sed.sh             # Rebranding: OpenCode -> VYLUX
    opencode/vylux-models.json        # Custom models config (VYLUX endpoint)
    opencode/vylux-provider.ts        # Custom provider for VYLUX GET-based API
  scripts/
    env.sh                            # Build environment
    build-*.sh                        # Build scripts for each component
  .github/workflows/
    build.yml                         # CI pipeline
```

## Build

Requires x86_64 Linux with Android NDK r28b, CMake 3.24+, 16GB+ RAM, 60GB+ disk.

```bash
source scripts/env.sh
./scripts/build-opencode.sh
```

## License

MIT &copy; VYLUX TECH
