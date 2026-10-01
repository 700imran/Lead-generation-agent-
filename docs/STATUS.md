# Status (v0.7.1)

## Verified (automated: `cd cloudflare-worker && npm test`)
Runs the real Worker + Workflow code in workerd (Miniflare) with real D1/SQLite, R2, Queues and Workflows, against both `schema.sql` and the migration chain 0001→0004. Only Workers AI and outbound HTTP are mocked.
Covers: auth (bearer/cookie/tamper), tenant isolation, admin-only routes, task + multi-step workflow, approval pause/approve/reject/double-approve, kill switch fail-closed (including in-flight), signed webhooks, robots.txt + SSRF/redirect blocking, R2 caching, compute-budget stop, queue ingress, tenant suspension, cron sweep.
Also verified: `wrangler deploy --dry-run` bundles and validates all bindings.

## NOT verified
- A real Cloudflare account deploy (needs your account; not done from this environment).
- Real Workers AI output quality/latency/cost. The compute budget is an *estimate* (chars/4 tokens × `EST_COST_PER_1K_TOKENS_USD`), not billing data.
- Any third-party connector — none exist (see below).

## Known limitations (be honest with clients)
- **Agent steps are LLM drafts/analysis only.** Steps named `send_message`, `send_outreach`, `call`, `deploy`, `release`, `payment_request`, `activate`… are approval-gated and produce a draft/recommendation. Nothing is actually emailed, called, charged or deployed; there are no connectors.
- `discover_public_sources` and `route_allowed_proxy` have no provider behind them and return `implemented:false`. `fetch_and_cache` and `verify_source_terms` (robots.txt) are real.
- Login has no rate limiting (add a Cloudflare WAF rate-limit rule on `/api/login`). Admin auth is a single shared `ADMIN_TOKEN`.
- Approval/webhook/queue paths are tenant-scoped; there is no per-tenant usage metering beyond the per-task estimate.
- `agency/`, `website-connector/` and some `docs/` files are design documents from earlier versions; they describe intended behaviour and some still mention a Hermes runtime that this version does not use.
