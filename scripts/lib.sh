#!/usr/bin/env bash
# shared helpers (sourced)
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HROOT="${HERMES_ROOT:-$HOME/.hermes}"
BRAIN="lg-brain"
LANES_FILE="$HROOT/leadgen-kit.lanes"
export PATH="$HOME/.local/bin:$PATH"

pdir() { echo "$HROOT/profiles/$1"; }

need_hermes() {
  command -v hermes >/dev/null 2>&1 || { echo "hermes not found. Run scripts/install.sh first." >&2; exit 1; }
}

# apply "key value" lines from a settings file to a profile
apply_settings() { # profile file
  local p="$1" f="$2" k v
  while read -r k v; do
    [[ -z "${k:-}" || "$k" == \#* ]] && continue
    hermes -p "$p" config set "$k" "$v" --force >/dev/null
  done < "$f"
}

# copy src->dst but never clobber edits (yours or the agent's own self-improvement).
# If dst changed since the kit last wrote it, the new kit version goes to dst.kit-new.
sync_file() { # src dst
  local src="$1" dst="$2" shadow
  shadow="$(dirname "$dst")/.kit/$(basename "$dst").orig"
  mkdir -p "$(dirname "$dst")" "$(dirname "$shadow")"
  if [[ ! -f "$dst" ]]; then
    cp "$src" "$dst"; cp "$src" "$shadow"
  elif [[ ! -f "$shadow" ]]; then
    # first time the kit touches this file (e.g. Hermes' default SOUL.md): back it up, then install ours
    cmp -s "$src" "$dst" || cp "$dst" "$dst.bak"
    cp "$src" "$dst"; cp "$src" "$shadow"
  elif cmp -s "$dst" "$shadow"; then
    cp "$src" "$dst"; cp "$src" "$shadow"        # untouched since last kit write -> safe to upgrade
  elif cmp -s "$src" "$dst"; then
    cp "$src" "$shadow"
  else
    cp "$src" "$dst.kit-new"
    echo "  ! $(basename "$dst") was modified (by you or the agent) - kept it; new kit version saved as $dst.kit-new"
  fi
}
