#!/usr/bin/env bash
# Create the scheduled jobs (idempotent by job name). Deliveries go to the admin on Telegram.
set -euo pipefail
CRON_FAIL=0
source "$(dirname "$0")/lib.sh"; need_hermes

add_job() { # profile name schedule skill prompt
  local p="$1" name="$2" sched="$3" skill="$4" prompt="$5"
  # (capture output first: grep -q + pipefail would SIGPIPE the pipeline and give false negatives)
  local existing; existing="$(hermes -p "$p" cron list 2>/dev/null || true)"
  if grep -qF "Name:      $name" <<<"$existing"; then echo "  = $p/$name exists"; return; fi
  hermes -p "$p" cron create "$sched" "$prompt" --name "$name" --skill "$skill" --deliver telegram 2>&1 | grep -i -E "fail|error" || true
  # the CLI can exit 0 on failure, so verify by listing
  existing="$(hermes -p "$p" cron list 2>/dev/null || true)"
  if grep -qF "Name:      $name" <<<"$existing"; then echo "  + $p/$name ($sched)"
  else echo "  ! FAILED to create $p/$name (is croniter installed? see: hermes doctor)" >&2; CRON_FAIL=1; fi
}

echo "== brain jobs"
add_job "$BRAIN" leadgen-prospecting "0 9 * * 1-6" leadgen-prospecting \
  "Run the daily prospecting routine for the current niche and report to the admin."
add_job "$BRAIN" leadgen-draft-outreach "30 9 * * 1-6" leadgen-outreach \
  "Draft first-contact messages for qualified leads without drafts, queue them for admin approval."
add_job "$BRAIN" leadgen-followup-sweep "every 3h" leadgen-followup-closing \
  "Run the follow-up sweep and surface replies that need the admin."
add_job "$BRAIN" leadgen-self-review "0 20 * * 0" leadgen-self-review \
  "Run the weekly self-review, apply at most 3 safe improvements, log them, report to the admin."

echo "== lane jobs (senders)"
[[ -f "$LANES_FILE" ]] && while read -r l; do
  [[ -z "$l" ]] && continue
  kind="${l%%:*}"; name="${l#*:}"; [[ "$kind" == whatsapp ]] && kind=wa
  add_job "lg-$kind-$name" leadgen-send-approved "every 10m" leadgen-outreach \
    "Send approved Outbox rows for this lane only, then log results."
done < "$LANES_FILE"
echo "Note: cron runs only while that profile's gateway is running (hermes -p <profile> gateway install)."
exit $CRON_FAIL
