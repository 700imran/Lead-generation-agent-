#!/usr/bin/env bash
set -euo pipefail
node --check src/index.js
node --check src/workflow.js
printf '%s\n' 'Static Worker syntax: PASS'
printf '%s\n' 'Cloudflare-native bindings: AI, D1, R2, Queue, Workflow'
printf '%s\n' 'Legacy VPS/Hermes execution path: removed from deployable package'
