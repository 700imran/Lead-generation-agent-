#!/usr/bin/env bash
# Install Hermes Agent (official installer) + create/configure the lead-gen profiles.
# Usage: install.sh [--llm external|local] [email:<name> ...] [whatsapp:<name> ...]
set -euo pipefail
source "$(dirname "$0")/lib.sh"
if ! command -v hermes >/dev/null 2>&1; then
  echo "== Installing Hermes Agent (Nous Research official installer)"
  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
  export PATH="$HOME/.local/bin:$PATH"; hash -r
fi
need_hermes
hermes --version
"$KIT/scripts/setup_profiles.sh" "$@"
"$KIT/scripts/cron.sh"
echo; echo "Next steps:"
echo "  1) edit ~/.hermes/profiles/*/.env"
echo "  2) hermes -p $BRAIN     (finish Google Workspace/Sheets setup: ask it to set up google-workspace)"
echo "  3) for each profile:  hermes -p <profile> gateway install && hermes -p <profile> gateway start"
echo "  4) scripts/verify.sh"
