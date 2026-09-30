#!/usr/bin/env bash
# Upgrade Hermes itself, then re-sync this kit WITHOUT overwriting what the agent has learned.
set -euo pipefail
source "$(dirname "$0")/lib.sh"; need_hermes
echo "== Hermes update"; hermes update --check || true
hermes update --yes
echo "== Re-sync kit (settings, SOUL, skills; agent-modified files are preserved)"
mapfile -t LANES < <(grep -v '^$' "$LANES_FILE" 2>/dev/null || true)
"$KIT/scripts/setup_profiles.sh" "${LANES[@]:-}"
"$KIT/scripts/cron.sh"
hermes doctor || true
find "$HROOT/profiles" -name '*.kit-new' 2>/dev/null | sed 's/^/REVIEW: /'
echo "Restart gateways: hermes -p <profile> gateway restart"
