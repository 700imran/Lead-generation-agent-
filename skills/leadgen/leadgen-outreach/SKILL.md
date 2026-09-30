---
name: leadgen-outreach
description: "Draft, get approval for, and send first-contact outreach on email or WhatsApp."
version: 1.0.0
author: Lead-generation-agent kit
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Outreach, Email, WhatsApp, Sales]
    related_skills: [leadgen-crm-sheet, leadgen-followup-closing]
---

# Outreach

## Brain profile (lg-brain): drafting
1. For each `qualified` lead with no draft: write ONE message for its best channel
   (email if a business email exists, else WhatsApp). Under 120 words, one ask
   (a 15-minute call or a yes/no reply), one real observation about their business,
   the measurable problem (leads / follow-up speed / manual work), no hype.
2. Email: add subject + closing line "Reply STOP and we won't contact you again."
3. Put it in `Outbox` as `pending_approval`, set lead `status=drafted`, and send the admin a
   Telegram summary (company, channel, full draft, draft_id). Wait for approve / reject / edit.
4. On approval set `state=approved` and the lane name (round-robin across lanes of that channel).

## Lane profiles (lg-email-*, lg-wa-*): sending
1. Every 10 minutes pick `Outbox` rows with `state=approved` for THIS lane only.
2. Re-check the lead is not `do_not_contact` and the daily cap (40 per lane) isn't hit.
3. Send with this profile's messaging tool (email or WhatsApp). WhatsApp first contact needs an
   approved template; if none exists, mark the row `blocked_needs_template` and tell the admin.
4. Mark `sent`, set lead `status=contacted`, `last_contact`, `next_followup` (see
   leadgen-followup-closing), and write a Log row.

## Pitfalls
- Never send anything that is not `approved`. Never edit an approved body silently.
- Test a new lane by sending to the admin's own address/number first.
