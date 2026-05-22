#!/usr/bin/env bash
# Rebrand OpenCode source to VYLUX AI
# Run inside the cloned opencode source directory (packages/opencode/)
# Usage: cd packages/opencode && bash /path/to/vylux-sed.sh

set -euo pipefail

echo "=== Rebranding OpenCode -> VYLUX ==="

# -- Package metadata --
sed -i 's/"name": "opencode"/"name": "vylux"/' package.json
sed -i 's|"description": "AI-powered development tool"|"description": "VYLUX AI - Terminal AI coding assistant by VYLUX TECH"|' package.json
sed -i 's|"description": "AI-assisted development tool"|"description": "VYLUX AI - Terminal AI coding assistant by VYLUX TECH"|' package.json

# -- Binary name --
sed -i 's/"opencode":/"vylux":/' package.json
sed -i 's|./bin/opencode|./bin/vylux|' package.json

# -- CLI script name --
find src/ -name '*.ts' -exec sed -i 's/\.scriptName("opencode")/.scriptName("vylux")/g' {} +

# -- Environment variable prefix --
find src/ -name '*.ts' -exec sed -i 's/process\.env\.OPENCODE/process.env.VYLUX/g' {} +
find src/ -name '*.ts' -exec sed -i 's/"OPENCODE_/\"VYLUX_/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'OPENCODE_'/'VYLUX_'/g" {} +

# -- XDG directory names --
find src/ -name '*.ts' -exec sed -i 's|"opencode"|"vylux"|g' {} +
find src/ -name '*.ts' -exec sed -i "s/'opencode'/'vylux'/g" {} +

# -- User-Agent string --
find src/ -name '*.ts' -exec sed -i 's|opencode/|vylux/|g' {} +

# -- Referer / X-Title headers --
find src/ -name '*.ts' -exec sed -i 's|"X-Title": "opencode"|"X-Title": "VYLUX"|g' {} +
find src/ -name '*.ts' -exec sed -i 's|"HTTP-Referer": "https://opencode.ai/"|"HTTP-Referer": "https://vylux.tech/"|g' {} +
find src/ -name '*.ts' -exec sed -i 's|opencode\.ai|vylux.tech|g' {} +

# -- Integration headers --
find src/ -name '*.ts' -exec sed -i 's|"X-Cerebras-3rd-Party-Integration": "opencode"|"X-Cerebras-3rd-Party-Integration": "vylux"|g' {} +

# -- Config schema URL --
find src/ -name '*.ts' -exec sed -i 's|https://opencode.ai/config.json|https://vylux.tech/config.json|g' {} +

# -- OAuth client ID --
find src/ -name '*.ts' -exec sed -i "s/'opencode-cli'/'vylux-cli'/g" {} +

# -- Provider ID --
find src/ -name '*.ts' -exec sed -i 's/providerID === "opencode"/providerID === "vylux"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/providerID === 'opencode'/providerID === 'vylux'/g" {} +

# -- Process env markers --
find src/ -name '*.ts' -exec sed -i 's/process\.env\.VYLUX = "1"/process.env.VYLUX = "1"/g' {} +
find src/ -name '*.ts' -exec sed -i 's/process\.env\.VYLUX_PID/process.env.VYLUX_PID/g' {} +

# -- Global paths (XDG) --
find src/ -name '*.ts' -exec sed -i 's|const app = "opencode"|const app = "vylux"|g' {} +
find src/ -name '*.ts' -exec sed -i "s|const app = 'opencode'|const app = 'vylux'|g" {} +

# -- Logo text --
find src/ -name '*.ts' -exec sed -i 's/OPENCODE/VYLUX/g' {} +

# -- Config paths --
find src/ -name '*.ts' -exec sed -i 's|/opencode|/vylux|g' {} +
find src/ -name '*.ts' -exec sed -i "s|'/opencode|'/vylux|g" {} +

# -- Installation NPM package name --
find src/ -name '*.ts' -exec sed -i 's/npm install -g opencode-ai/npm install -g vylux-ai/g' {} +

# -- Default model priority -- deepseek then gemini
find src/ -name '*.ts' -exec sed -i 's/"gpt-5"/"deepseek"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'gpt-5'/'deepseek'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"claude-sonnet-4"/"gemini"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'claude-sonnet-4'/'gemini'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"big-pickle"/"deepseek"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'big-pickle'/'deepseek'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"gemini-3-pro"/"gemini"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'gemini-3-pro'/'gemini'/g" {} +

# -- Remove third-party credits and references from source --
find src/ -name '*.ts' -exec sed -i 's|See the \[OpenCode docs\](https://github.com/anomalyco/opencode)|See https://vylux.tech|g' {} +
find src/ -name '*.ts' -exec sed -i 's|See the OpenCode documentation|See vylux.tech|g' {} +

echo "=== Rebranding complete ==="
