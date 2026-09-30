# Web Intelligence & Proxy Policy

OrbitReach supports a compliant fetch layer for public/authorized data.

Allowed controls:
- caching
- exponential backoff
- per-domain rate limits
- concurrency limits
- retries
- source health tracking
- optional proxy routing for availability, geographic testing, or traffic distribution within source limits

Forbidden:
- CAPTCHA bypass
- WAF/anti-bot bypass
- authentication bypass
- fingerprint evasion
- deliberate rate-limit evasion
- scraping private/restricted data

If a source blocks the agent, the agent records the block, stops that source, waits/retries according to policy, or uses another permitted source. The proxy layer is not a mechanism to defeat a website's security controls.
