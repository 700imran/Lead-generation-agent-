#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node --check src/index.js
echo "Static Worker syntax: PASS"
