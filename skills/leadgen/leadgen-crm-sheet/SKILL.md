---
name: leadgen-crm-sheet
description: "Read/write the lead-generation CRM Google Sheet (Leads, Outbox, Log, Learnings tabs)."
version: 1.0.0
author: Lead-generation-agent kit
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [CRM, Google-Sheets, Pipeline]
    related_skills: [google-workspace, leadgen-outreach]
---

# CRM in Google Sheets

Uses the bundled `google-workspace` skill for Sheets access (complete its OAuth setup once).
The sheet ID lives in this profile's memory as "CRM sheet id"; ask the admin if missing.

## Tabs and columns
- **Leads**: id, company, contact_name, email, phone, website, city, source, status, score,
  reason, channel, lane, last_contact, followups_sent, next_followup, notes, created
  - status: new, qualified, unqualified, drafted, approved, contacted, replied, interested,
    pilot_proposed, closed_won, closed_lost, do_not_contact
- **Outbox**: draft_id, lead_id, lane, channel, to, subject, body, kind(first|followup|reply),
  state(pending_approval|approved|sent|rejected), created, sent_at
- **Log**: timestamp, lead_id, event, detail, profile
- **Learnings**: date, observation, change_made, evidence

## Rules
- Read before write; update rows by `id`, never append duplicates.
- Every send, reply, opt-out and status change gets a Log row.
- `do_not_contact` is permanent and checked before ANY send on ANY lane.
- Create missing tabs/headers on first use.
