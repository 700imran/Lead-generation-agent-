# Deployment checklist (Cloudflare)

Fastest: `cd cloudflare-worker && ./deploy.sh` (D1 + R2 are already provisioned). Manual steps below. Run from `cloudflare-worker/`. Needs `wrangler login` (or `CLOUDFLARE_API_TOKEN` with Workers, D1, R2, Queues edit) and Workers AI enabled on the account.

- [ ] `npm install && npm test` — all checks pass
- [ ] `cp wrangler.toml.example wrangler.toml`
- [ ] `npx wrangler d1 create orbitreach` → paste `database_id` into `wrangler.toml`
- [ ] `npx wrangler r2 bucket create orbitreach-data`
- [ ] `npx wrangler queues create orbitreach-agent-jobs`
- [ ] `npx wrangler d1 execute orbitreach --remote --file=./schema.sql` (fresh DB) — or apply `migrations/0001…0004` in order
- [ ] `openssl rand -hex 32 | npx wrangler secret put ADMIN_TOKEN`; same for `SESSION_SECRET` and `WEBHOOK_SECRET` (all different)
- [ ] `npx wrangler deploy`
- [ ] `curl https://<worker>/health` → ok; `curl -H "Authorization: Bearer $ADMIN" https://<worker>/ready` → all bindings/secrets true
- [ ] Open `https://<worker>/` (admin dashboard), sign in, create a tenant, save its token
- [ ] Add a WAF rate-limit rule for `/api/login`
- [ ] Test kill switch and one approval round-trip on production
