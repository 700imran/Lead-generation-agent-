# OrbitReach — Cloudflare-native serverless agent

This version removes the VPS/Hermes runtime dependency. Agent execution is handled by Cloudflare Workers + Workflows, with D1 for tenant-scoped relational state, R2 for cached research artifacts, Queues for asynchronous ingress, and Workers AI for model inference.

## Architecture

Request → authenticated tenant context → policy/tool gateway → Workflow → durable micro-actions → D1/R2 → approval wait → resume.

A Worker isolate may disappear at any time. No agent state depends on process memory. Cloudflare Workflows persists completed steps and can sleep/wait for external approval, so a sudden Worker/isolate stop does not require a VPS to resume the workflow.

## Required production setup

1. Create D1 database and apply `schema.sql` (or migration `0003_cloudflare_native.sql` on an existing database).
2. Create R2 bucket `orbitreach-data`.
3. Create Queue `orbitreach-agent-jobs`.
4. Enable Workers AI (bound as `AI`).
5. Copy `wrangler.toml.example` to `wrangler.toml` and replace `database_id`.
6. Set secrets:

```bash
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put SESSION_SECRET
npx wrangler secret put WEBHOOK_SECRET
```

`SESSION_SECRET` should be a high-entropy random secret. Never reuse the admin token as the session secret.

## Tenant isolation

Tenant API tokens are stored only as SHA-256 hashes. Every task, approval, result and audit query is scoped by `tenant_id`. Client-supplied tenant IDs are ignored for non-admin bearer tokens. Admin access is the only cross-tenant administrative path.

Create tenant tokens outside the application or through an admin-only provisioning flow. Do not store raw tenant tokens in D1.

## Human approval

Approval-required steps create a durable approval record. The workflow returns to a waiting state rather than holding a Worker request open. An admin approval resumes the workflow with `sendEvent({ type: "approval" ... })`.

## Kill switch

`POST /api/kill-switch` with `{ "enabled": false }` immediately blocks new micro-actions. Existing Workflow instances will hit the kill-switch check before their next action and fail closed.

## Webhooks

`POST /api/webhook` requires `X-Orbit-Signature = HMAC-SHA256(WEBHOOK_SECRET, raw_body)` and a tenant_id in the signed body.

## Runtime policy

The LLM is not a security authority. Deterministic code enforces authentication, authorization, tenant isolation, approvals, budgets, retries, URL safety, and stop conditions. External content is treated as data and never as instructions.

## API

| Route | Auth | Purpose |
|---|---|---|
| `GET /health`, `GET /ready` | none / any | liveness; bindings + secrets present |
| `POST /api/login`, `/api/logout` | admin token | HttpOnly 8h session cookie |
| `POST /api/tenant`, `/api/tenant/status` | admin | create tenant (returns token once), suspend/activate |
| `POST /api/task` | tenant/admin | start a workflow `{action,input,priority}` |
| `POST /api/enqueue` | tenant/admin | same via Queue (async ingress) |
| `GET /api/task?id=` | tenant/admin | task, steps, results |
| `GET /api/approvals`, `POST /api/approval` | read: any, decide: admin | `{approval_id, approve:true|false}` |
| `POST /api/kill-switch` | admin | `{enabled:false}` stops all agents |
| `GET /api/state` | tenant/admin | tasks, agents, audit, approvals |
| `POST /api/webhook` | tenant bearer + `X-Orbit-Signature` | HMAC-SHA256 of raw body with `WEBHOOK_SECRET`, hex or base64url; disabled if secret unset |

`GET /` serves the admin dashboard from `public/`. A cron (`*/5`) expires stale approvals and fails stuck tasks.

## Deploy

See `../docs/DEPLOYMENT-CHECKLIST.md`.

## Test

```bash
npm install
npm test        # e2e in workerd: D1, R2, Queues, Workflows real; Workers AI + outbound HTTP mocked
npm run dry-run # wrangler bundle + binding validation (needs wrangler.toml)
```

See `../docs/STATUS.md` for what is and is not verified, and known limitations (notably: agent steps draft/recommend only; no email/call/payment connectors).
