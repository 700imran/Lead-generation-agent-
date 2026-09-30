# OrbitReach Runtime Smoke Test

`runtime-smoke.mjs` imports the actual packaged Cloudflare Worker module and exercises its HTTP handlers against an in-memory D1-compatible test double and a local Hermes-compatible mock endpoint.

It verifies: health, bounded micro-actions, Admin outreach approval/resume, Admin payment confirmation, payment-gated delivery, and Admin pause.

This is an integration/runtime simulation, not a claim that the real Cloudflare D1 account or external provider credentials were exercised.
