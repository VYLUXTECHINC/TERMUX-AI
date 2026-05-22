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

Build the real cross-compiled binary using your Pterodactyl panel:

**Method 1 — Node.js egg (you already have this):**
1. Create a new server with the **Node.js** egg
2. Allocate **16GB+ RAM** and **60GB+ disk**
3. Upload [`scripts/build-vylux.js`](scripts/build-vylux.js) via **File Manager**
4. Set **Startup Command** to: `node build-vylux.js`
5. **Start** the server — build runs automatically (~30-60 min)
6. Download the binary from **Files → /home/container/output/**

**Method 2 — Import the custom egg (admin only):**
1. Go to **Nest → Import Egg** and upload [`scripts/egg-vylux-builder.json`](scripts/egg-vylux-builder.json)
2. Create a server with the "VYLUX AI Builder" egg and start it

**Method 3 — Any Linux server:**
```bash
bash <(curl -sL https://raw.githubusercontent.com/VYLUXTECHINC/TERMUX-AI/main/scripts/build-on-pterodactyl.sh)
```

Output:
- `vylux` — standalone binary (put in `$PREFIX/bin/`)
- `vylux-aarch64.zip` / `.deb` / `.pkg.tar.xz` — packages

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
