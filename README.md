# OpenCode with custom AI endpoint

Builds [OpenCode](https://github.com/anomalyco/opencode) for Android/Termux using a private AI endpoint.

---

## Build (Pterodactyl Node.js egg)

Set startup command to:

```
node /home/container/build-vylux.js
```

Upload `scripts/build-vylux.js` to `/home/container/` via File Manager.

Allocate **16GB+ RAM**, **60GB+ disk**, then start. Binary appears in `/home/container/output/`.

## Check your AI

```bash
node check-models.js
```

## Usage on Termux

```bash
chmod +x opencode
mv opencode $PREFIX/bin/
opencode
```

## License

MIT
