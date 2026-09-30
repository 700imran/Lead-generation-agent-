#!/usr/bin/env bash
# Usage: setup_profiles.sh [--llm external|local] [lane ...]
#   lane = email:<name> | whatsapp:<name>     e.g.  email:sales1 email:sales2 whatsapp:wa1
# Always creates the admin/brain profile (lg-brain). Safe to re-run (idempotent).
set -euo pipefail
source "$(dirname "$0")/lib.sh"; need_hermes

LLM="external"; LANES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --llm) LLM="$2"; shift 2;;
    email:*|whatsapp:*) LANES+=("$1"); shift;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done
[[ "$LLM" == external || "$LLM" == local ]] || { echo "--llm must be external|local" >&2; exit 2; }

# lanes remembered for update.sh
mkdir -p "$HROOT"
touch "$LANES_FILE"
for l in "${LANES[@]:-}"; do [[ -n "$l" ]] && { grep -qxF "$l" "$LANES_FILE" || echo "$l" >> "$LANES_FILE"; }; done
mapfile -t ALL_LANES < <(grep -v '^$' "$LANES_FILE" || true)

lane_profile() { # email:sales1 -> lg-email-sales1
  local kind="${1%%:*}" name="${1#*:}"; [[ "$kind" == whatsapp ]] && kind=wa
  echo "lg-$kind-$name"
}

setup_one() { # profile kind(brain|email|whatsapp) [index]
  local p="$1" kind="$2" idx="${3:-0}" d; d="$(pdir "$p")"
  if [[ ! -d "$d" ]]; then
    echo "== creating profile $p"; hermes profile create "$p" --no-alias >/dev/null
  else
    echo "== updating profile $p"
  fi
  apply_settings "$p" "$KIT/config/common.settings"
  apply_settings "$p" "$KIT/config/model.$LLM.settings"

  # persona (lanes get a short lane footer)
  local soul="$KIT/config/SOUL.md" tmp; tmp="$(mktemp)"
  cp "$soul" "$tmp"
  [[ "$kind" != brain ]] && printf '\n## Lane\nYou are the %s lane "%s". You only SEND approved Outbox rows for your own lane and handle replies arriving on your own channel. Prospecting and drafting belong to lg-brain.\n' "$kind" "$p" >> "$tmp"
  sync_file "$tmp" "$d/SOUL.md"; rm -f "$tmp"

  # skills (brain gets all; lanes get all too so they can log/handle replies)
  for s in "$KIT"/skills/leadgen/*/SKILL.md; do
    sync_file "$s" "$d/skills/leadgen/$(basename "$(dirname "$s")")/SKILL.md"
  done

  # env template: appended once (marker), never overwrites keys you already filled in
  if ! grep -q "lead-gen kit env" "$d/.env" 2>/dev/null; then
    { echo; echo "# --- lead-gen kit env ---"; cat "$KIT/env/$( [[ $kind == brain ]] && echo brain || echo $kind ).env.example"
      [[ "$kind" == whatsapp ]] && echo "WHATSAPP_CLOUD_WEBHOOK_PORT=$((8090 + idx))"; } >> "$d/.env"
    chmod 600 "$d/.env"
    echo "  -> fill in $d/.env"
  fi
}

setup_one "$BRAIN" brain
wa=0
for l in "${ALL_LANES[@]:-}"; do
  [[ -z "$l" ]] && continue
  kind="${l%%:*}"
  setup_one "$(lane_profile "$l")" "$kind" "$wa"
  [[ "$kind" == whatsapp ]] && wa=$((wa+1))
done
echo "Done. Next: fill the .env files, then scripts/cron.sh and 'hermes -p <profile> gateway install'."
