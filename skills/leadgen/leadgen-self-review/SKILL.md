---
name: leadgen-self-review
description: "Weekly review of outcomes; improve leadgen skills, targeting and messaging safely."
version: 1.0.0
author: Lead-generation-agent kit
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Self-improvement, Analytics, Skills]
    related_skills: [leadgen-crm-sheet, leadgen-outreach]
---

# Weekly self-review (closes the learning loop)

1. From `Leads`, `Outbox` and `Log` compute for the last 7 days: leads found, qualified rate,
   messages sent, reply rate, positive-reply rate, opt-out rate, calls booked, pilots proposed.
2. Compare messages that got positive replies with those that got none (length, opener, ask,
   channel, niche, city, day/time). Only claim patterns that have at least 5 examples;
   otherwise write "not enough data".
3. Make at most 3 concrete improvements: edit the relevant `leadgen-*` skill (prospecting
   filters, outreach templates, follow-up timing) or save a memory. Prefer small edits.
4. Record each change in the `Learnings` tab: observation, change made, evidence (counts).
5. Send the admin a short Telegram report: metrics, what changed, what to test next week.

## Guardrails
- Never change the Hard rules in SOUL.md, opt-out handling, approval requirements or send caps.
- If opt-out or complaint rate rose, tighten targeting/wording and tell the admin first.
- Keep a one-line rollback note per edit in `Learnings` so the admin can revert.
