# Production deployment checklist

## Hermes runtime
- [ ] Hermes installed on PC/VPS/cloud VM
- [ ] `agency-main` and specialist profiles created
- [ ] Provider/model credentials stored in Hermes `.env`, not source
- [ ] API server enabled with strong `API_SERVER_KEY`
- [ ] HTTPS/private network path from Cloudflare Worker to Hermes
- [ ] Profile routing verified for `/p/agency-main/v1/...`
- [ ] Hermes tools/MCP permissions reviewed per profile
- [ ] Backups for Hermes profile state and D1 enabled

## Cloudflare
- [ ] D1 database created
- [ ] D1 migration applied
- [ ] `HERMES_API_KEY` stored as Worker secret
- [ ] `ADMIN_TOKEN` stored as Worker secret
- [ ] `HERMES_BASE_URL` and `HERMES_PROFILE` configured
- [ ] Cloudflare Access enabled for dashboard
- [ ] Worker deployed
- [ ] `/health` passes
- [ ] `/api/state` requires admin auth in production
- [ ] Cron tick observed in D1 events

## Agency
- [ ] Lead sources are permitted and lawful
- [ ] Outreach identity and opt-out handling configured
- [ ] Bulk outreach approval gate tested
- [ ] Pricing/discount approval gate tested
- [ ] Production deploy approval gate tested
- [ ] Tool outage isolation tested
- [ ] Retry and escalation tested
- [ ] Admin pause/reassign/cancel tested
