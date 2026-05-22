#!/usr/bin/env bash
# Configure OpenCode source for custom AI endpoint
# Run inside the cloned opencode source directory (packages/opencode/)
# Usage: cd packages/opencode && bash /path/to/vylux-sed.sh

set -euo pipefail

echo "=== Configuring custom AI endpoint ==="

# -- Default model priority -- deepseek then gemini
find src/ -name '*.ts' -exec sed -i 's/"gpt-5"/"deepseek"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'gpt-5'/'deepseek'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"claude-sonnet-4"/"gemini"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'claude-sonnet-4'/'gemini'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"big-pickle"/"deepseek"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'big-pickle'/'deepseek'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"gemini-3-pro"/"gemini"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'gemini-3-pro'/'gemini'/g" {} +

echo "=== Configuration complete ==="
