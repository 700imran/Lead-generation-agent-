# OrbitReach — Cloudflare-native serverless agent

This version removes the VPS/Hermes runtime dependency. Agent execution is handled by Cloudflare Workers + Workflows, with D1 for tenant-scoped relational state, R2 for cached research artifacts, Queues for asynchronous ingress, and Workers AI for model inference.

## Architecture

Request → authenticated tenant context → policy/tool gateway → Workflow → durable micro-actions → D1/R2 → approval wait → resume.

A Worker isolate may disappear at any time. No agent state depends on process memory. Cloudflare Workflows persists completed steps and can sleep/wait for external approval, so a sudden Worker/isolate stop does not require a VPS to resume the workflow.

## Required production setup

1. Create D1 database and apply `schema.sql` (or migration `0003_cloudflare_native.sql` on an existing database).
2. Create R2 bucket `orbitreach-data`.
3. Create Queue `orbitreach-agent-jobs`.
4. Enable Workers AI and bind `AI`.
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

## Deploy

```bash
npx wrangler d1 create orbitreach
npx wrangler r2 bucket create orbitreach-data
npx wrangler queues create orbitreach-agent-jobs
npx wrangler d1 execute orbitreach --remote --file=./schema.sql
npx wrangler deploy
```

For an existing D1 database, apply the migration instead of recreating the schema.

## Test

```bash
npx wrangler dev --local
```

Then verify `/health`, authentication, tenant-scoped task creation, approval wait/resume, kill switch, signed webhook rejection, and retry behavior.
