#!/usr/bin/env bash
# One-command deploy. Run from your own machine (needs internet access to api.cloudflare.com).
#   export CLOUDFLARE_API_TOKEN=...   (Workers Scripts, D1, R2, Queues: Edit)
#   export CLOUDFLARE_ACCOUNT_ID=...
#   ./deploy.sh
# D1 (orbitreach) and R2 (orbitreach-data) are already provisioned and wired in wrangler.toml.
set -euo pipefail
cd "$(dirname "$0")"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}" "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
npm install --no-audit --no-fund
npm test
npx wrangler d1 execute orbitreach --remote --file=./schema.sql >/dev/null   # idempotent (IF NOT EXISTS)
npx wrangler queues create orbitreach-agent-jobs 2>&1 | grep -qiE "created|already exists" || true
npx wrangler deploy
ADMIN=$(openssl rand -hex 32); SESS=$(openssl rand -hex 32); HOOK=$(openssl rand -hex 32)
if npx wrangler secret list 2>/dev/null | grep -q ADMIN_TOKEN; then
  echo "Secrets already set; keeping them."
else
  printf '{"ADMIN_TOKEN":"%s","SESSION_SECRET":"%s","WEBHOOK_SECRET":"%s"}' "$ADMIN" "$SESS" "$HOOK" | npx wrangler secret bulk
  echo; echo "SAVE THESE NOW (shown once):"; echo "ADMIN_TOKEN=$ADMIN"; echo "WEBHOOK_SECRET=$HOOK"
fi
echo; echo "Deployed. Check: curl https://orbitreach-agent.<your-subdomain>.workers.dev/health"
