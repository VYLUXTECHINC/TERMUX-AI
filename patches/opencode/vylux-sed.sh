#!/usr/bin/env bash
# Configure OpenCode source for custom AI endpoint
set -euo pipefail

echo "=== Configuring custom AI endpoint ==="

find src/ -name '*.ts' -exec sed -i 's/"gpt-5"/"deepseek"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'gpt-5'/'deepseek'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"claude-sonnet-4"/"deepseek"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'claude-sonnet-4'/'deepseek'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"big-pickle"/"deepseek"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'big-pickle'/'deepseek'/g" {} +
find src/ -name '*.ts' -exec sed -i 's/"gemini-3-pro"/"deepseek"/g' {} +
find src/ -name '*.ts' -exec sed -i "s/'gemini-3-pro'/'deepseek'/g" {} +

echo "=== Configuration complete ==="
