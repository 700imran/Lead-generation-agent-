#!/usr/bin/env bash
# Flip every leadgen profile between external API and local model (same code, same config).
# Usage: switch_llm.sh external|local
set -euo pipefail
source "$(dirname "$0")/lib.sh"; need_hermes
mode="${1:?usage: switch_llm.sh external|local}"
[[ -f "$KIT/config/model.$mode.settings" ]] || { echo "unknown mode $mode" >&2; exit 2; }
for d in "$HROOT"/profiles/lg-*/; do
  p="$(basename "$d")"; apply_settings "$p" "$KIT/config/model.$mode.settings"; echo "$p -> $mode"
done
echo "Restart gateways to apply: hermes -p <profile> gateway restart"
