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

## Full Binary Build (Pterodactyl)

If you have a Pterodactyl panel, build the real cross-compiled binary:

**Method 1 — Import the egg:**
1. In your Pterodactyl panel, go to **Nest → Import Egg**
2. Upload [`scripts/egg-vylux-builder.json`](scripts/egg-vylux-builder.json)
3. Create a new server using the "VYLUX AI Builder" egg
4. Allocate **16GB+ RAM** and **60GB+ disk** — then start it
5. Download the built binary from **Files → /home/container/output/**

**Method 2 — Manual (any Linux server):**
```bash
wget -O build-vylux.sh https://raw.githubusercontent.com/VYLUXTECHINC/TERMUX-AI/main/scripts/build-on-pterodactyl.sh
bash build-vylux.sh
```

Output files appear in `output/`:
- `vylux` — standalone binary for Termux
- `vylux-aarch64.zip` / `.deb` / `.pkg.tar.xz` — installable packages

## Repo Structure

```
patches/opencode/         Rebranding, models, provider
scripts/                  Build environment, Dockerfile, Pterodactyl egg
vylux_start               Launcher (binary first, Node fallback)
vylux-cli.js              Terminal AI client (Node.js, no build needed)
.github/workflows/        CI pipeline
```

## License

MIT &copy; VYLUX TECH
