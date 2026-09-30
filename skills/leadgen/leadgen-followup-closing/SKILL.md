---
name: leadgen-followup-closing
description: "Follow-up cadence, reply handling and closing to a paid pilot."
version: 1.0.0
author: Lead-generation-agent kit
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Follow-up, Closing, Sales, Pipeline]
    related_skills: [leadgen-crm-sheet, leadgen-outreach]
---

# Follow-up and closing

## Cadence
Follow-up 1 after 2 days, 2 after 5 more days, 3 after 10 more days, then stop and set
`closed_lost` (reason "no response"). Each follow-up adds something new (a relevant observation,
a tiny example, a specific question). Never guilt-trip.

## Reply handling (classify every inbound message)
- **unsubscribe / not interested** -> `do_not_contact` (unsubscribe) or `closed_lost`; one polite
  acknowledgement at most; tell the admin.
- **question** -> answer honestly from the offer in SOUL.md; if you don't know, say you'll check
  and escalate to the admin.
- **interested / wants details** -> propose a 15-minute call; ask for two time options.
- **ready** -> propose the paid pilot in one paragraph (scope, duration, setup fee + monthly fee
  as defined by the admin) and ask the admin to confirm terms before sending numbers.
Log every reply and outcome in `Log`; update the lead `status`.

## Follow-up sweep (brain profile, every few hours)
List leads with `next_followup <= now` and status `contacted`; draft the next follow-up into
`Outbox` (state `approved` when the first message was approved and the sequence is on).
Also surface replies needing admin attention to Telegram.
