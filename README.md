# VYLUX AI

**Made by VYLUX TECH**

Terminal AI coding assistant for Android (Termux). Powered by **DeepSeek** and **Gemini** through the VYLUX endpoint. No API key needed.

---

## Quick Start

```bash
pkg install nodejs git
git clone https://github.com/VYLUXTECHINC/TERMUX-AI.git
cd TERMUX-AI
./vylux_start
```

That's it. No NDK, no cross-compilation, no API keys.

## Commands

| Command | What it does |
|---|---|
| `/model deepseek\|gemini` | Switch AI model |
| `/clear` | Clear conversation |
| `/exit` | Quit |
| `/exec <command>` | Run a shell command |
| `/read <file>` | Read a file |
| `/write <file>` | Write to a file (paste content) |
| `/ls [dir]` | List directory contents |
| `/grep <pattern>` | Search files |
| `/glob <pattern>` | Find files by glob |
| `/history` | Show recent queries |
| `/stats` | Session statistics |

## Pre-built Binary

Once releases are built:

```bash
curl -LO https://github.com/VYLUXTECHINC/TERMUX-AI/releases/latest/download/vylux-aarch64.zip
unzip vylux-aarch64.zip
chmod +x vylux
mv vylux $PREFIX/bin/
pkg install ripgrep
vylux
```

## Repo Structure

```
patches/opencode/         Rebranding, models, provider
scripts/                  Build environment & scripts
vylux_start               Launcher (binary path first, Node fallback)
vylux-cli.js              Terminal AI client
.github/workflows/        CI pipeline
```

## Build (for contributors)

Requires x86_64 Linux + Android NDK r28b, CMake 3.24+, 16GB+ RAM, 60GB+ disk.

```bash
source scripts/env.sh
./scripts/build-opencode.sh
```

## License

MIT &copy; VYLUX TECH
