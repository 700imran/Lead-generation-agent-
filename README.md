# Lead-generation-agent-

A deployment kit that turns the real **[Hermes Agent](https://github.com/NousResearch/hermes-agent)**
(Nous Research, self-improving agent) into a B2B lead-generation sales agent: prospecting,
qualification, outreach, follow-ups, reply handling and closing to a paid pilot.
Nothing here re-implements Hermes - it installs/updates Hermes and configures it.

## Architecture (one Hermes profile per identity)
| Profile | Role | Channels |
|---|---|---|
| `lg-brain` | prospecting, scraping, qualification, drafting, CRM, cron, self-review | **Telegram = admin only** (`TELEGRAM_ALLOWED_USERS`) |
| `lg-email-<name>` | one mailbox: sends approved mails, handles replies | Email |
| `lg-wa-<name>` | one WhatsApp Cloud API number | WhatsApp |

Hermes supports one mailbox / one WhatsApp number per profile, so **multiple email and WhatsApp
accounts = multiple lane profiles** running side by side (each with its own gateway). Add as many
as you like. The Google Sheet is the shared CRM between all of them.

Flow: `lg-brain` finds + qualifies leads -> writes drafts to the sheet `Outbox` -> **you approve on
Telegram** -> the matching lane sends -> replies are classified/logged -> follow-up sweep.

## Install / upgrade
```bash
# install Hermes (official installer) + create profiles + cron jobs
./scripts/install.sh --llm external email:sales1 email:sales2 whatsapp:wa1

# fill secrets:  ~/.hermes/profiles/<profile>/.env     (templates in env/)
# Google Sheets: hermes -p lg-brain   -> "set up google-workspace", create the sheet, tell it the sheet id
# start each profile's gateway (cron only runs while the gateway runs):
hermes -p lg-brain gateway install && hermes -p lg-brain gateway start     # repeat per lane

./scripts/verify.sh      # PASS/FAIL for the self-improvement loop, skills, SOUL, cron
./scripts/update.sh      # hermes update + re-sync kit; agent-edited files are preserved
```
Add a lane later: `./scripts/setup_profiles.sh email:sales3 && ./scripts/cron.sh`.

## LLM: external API and local model (same code, same config)
`config/model.external.settings` (OpenRouter/DeepSeek/xAI/OpenAI keys in `.env`) and
`config/model.local.settings` (Ollama/vLLM/llama.cpp via the `custom` provider, default
`deepseek-r1:1.5b`). Flip everything with `./scripts/switch_llm.sh external|local`, or per chat with
`/model`. A 1.5B model is weak at tool use - fine for drafts/testing, use a stronger model for
prospecting and closing.

## Self-improvement loop (active by default)
Set by `config/common.settings` and checked by `verify.sh`:
- `memory.memory_enabled`, `memory.user_profile_enabled`, `memory.nudge_interval: 5` - agent keeps curated memory and is nudged every 5 turns to save what it learned.
- `skills.creation_nudge_interval: 8` - nudged to turn repeated work into skills.
- `auxiliary.background_review.enabled` - post-turn review fork that writes memories/skills.
- Weekly cron `leadgen-self-review` - computes reply/opt-out rates, edits the `leadgen-*` skills (max 3 changes), logs each change in the sheet's `Learnings` tab, reports to you on Telegram.
`update.sh` never overwrites a skill/SOUL the agent has improved; the new kit version is saved as `*.kit-new` for you to review.

## Safety rules (in `config/SOUL.md`)
Admin approval for every first message; opt-out = permanent `do_not_contact`; no scraping behind logins
or against robots.txt/terms; no invented facts; self-improvement can never weaken these rules.
These are instructions to the model, not hard technical locks - test with your own address/number
first and review the Outbox before approving.
WhatsApp first contact requires Meta-approved templates; cold email/WhatsApp is regulated (India DPDP Act, anti-spam rules, Meta policy). Start small and targeted.

## Hosting
Hermes runs on a laptop, a $5 VPS or Docker. Its gateways are long-running processes, so on Cloudflare
use a container/VPS with a Cloudflare Tunnel for the WhatsApp webhook (`https://<host>/whatsapp/webhook`,
port per profile from `.env`). A local LLM needs a machine that can run it; on hosted setups use `--llm external`.

## Tested vs not tested
Tested in a sandbox against upstream Hermes `2026.9.24`: profile creation, all config keys, cron jobs, idempotent
re-runs, preservation of agent-edited skills, LLM switch, `verify.sh`. **Not tested** (needs your accounts/keys): the official
installer one-liner, live LLM calls, Telegram/WhatsApp/email delivery, Google Sheets OAuth.
