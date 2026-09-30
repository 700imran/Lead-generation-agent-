#!/usr/bin/env bash
# Check that the self-improvement loop and lead-gen setup are really active.
set -uo pipefail
source "$(dirname "$0")/lib.sh"; need_hermes
fail=0
chk() { # profile key expected
  local got; got="$(hermes -p "$1" config get "$2" 2>/dev/null | tail -1 | sed 's/^.*= //')"
  if [[ "$got" == "$3" ]]; then echo "  PASS $1 $2=$got"; else echo "  FAIL $1 $2 (got '$got', want '$3')"; fail=1; fi
}
hermes --version | head -1
for d in "$HROOT"/profiles/lg-*/; do
  p="$(basename "$d")"; echo "== $p"
  chk "$p" memory.memory_enabled true
  chk "$p" memory.user_profile_enabled true
  chk "$p" memory.nudge_interval 5
  chk "$p" skills.creation_nudge_interval 8
  chk "$p" auxiliary.background_review.enabled true
  n=$(ls "$d"/skills/leadgen/*/SKILL.md 2>/dev/null | wc -l); [[ $n -ge 5 ]] && echo "  PASS $n leadgen skills" || { echo "  FAIL leadgen skills ($n)"; fail=1; }
  grep -q "Hard rules" "$d/SOUL.md" 2>/dev/null && echo "  PASS SOUL.md" || { echo "  FAIL SOUL.md"; fail=1; }
done
echo "== cron ($BRAIN)"; cl="$(hermes -p "$BRAIN" cron list 2>/dev/null || true)"
grep -E "Name: +leadgen-" <<<"$cl" || { echo "  FAIL no leadgen cron jobs"; fail=1; }
hermes doctor 2>&1 | tail -8
exit $fail
