# OpenCode with custom AI endpoint

Builds [OpenCode](https://github.com/anomalyco/opencode) for Android/Termux using a private AI endpoint.

**Models:** DeepSeek, Gemini (no API key needed)

---

## Check your models

```bash
node check-models.js
```

## Build (Pterodactyl)

Use your Node.js egg:

1. Set **Startup Command** to:
   ```
   bash <(curl -sL https://raw.githubusercontent.com/VYLUXTECHINC/TERMUX-AI/main/scripts/build-on-pterodactyl.sh)
   ```
2. Allocate **16GB+ RAM**, **60GB+ disk**
3. Start it — wait ~30-60 min
4. Download binary from **File Manager → /home/container/output/**

## Build manually

Requires x86_64 Linux + Android NDK r28b, CMake 3.24+, 16GB+ RAM, 60GB+ disk.

```bash
source scripts/env.sh
./scripts/build-opencode.sh
```

## Usage on Termux

```bash
chmod +x opencode
mv opencode $PREFIX/bin/
opencode
```

## License

MIT
