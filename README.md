# OrbitReach v0.7.1 — Cloudflare-native agent control plane

Serverless: Workers (HTTP, queue, cron) + Workflows (durable steps, human approval waits) + D1 + R2 + Queues + Workers AI.
No VPS, Docker or long-running process.

- Worker docs, API, setup and deploy: [`cloudflare-worker/README.md`](cloudflare-worker/README.md)
- Agent policy: [`cloudflare-worker/AGENT-POLICY.md`](cloudflare-worker/AGENT-POLICY.md)
- Deploy checklist: [`docs/DEPLOYMENT-CHECKLIST.md`](docs/DEPLOYMENT-CHECKLIST.md)
- Test status and known limitations: [`docs/STATUS.md`](docs/STATUS.md)

```bash
cd cloudflare-worker && npm install && npm test   # 122 e2e checks in a real workerd runtime
```
