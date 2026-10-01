# Agency manifest (design reference)

`agency.json`, `actions.json`, `admin-commands.json` and `events.schema.json` describe the intended agent organisation. The executable workflow table lives in `cloudflare-worker/src/index.js` (`ACTIONS`, `AGENTS`). Earlier versions referred to a Hermes runtime; v0.7.x does not use it.
