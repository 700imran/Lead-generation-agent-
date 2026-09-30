---
name: leadgen-prospecting
description: "Find, scrape and qualify B2B distributor leads; write them to the CRM sheet."
version: 1.0.0
author: Lead-generation-agent kit
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Leads, Prospecting, Scraping, CRM]
    related_skills: [leadgen-crm-sheet, leadgen-outreach]
---

# Prospecting

## When to Use
Daily prospecting run, or the admin asks "find leads for <niche> in <city>".

## Procedure
1. Read the CRM `Leads` tab first; never add a company already present (match domain or email).
2. Search the web for the niche + city (directories, association member lists, company sites).
   Use the web tools; respect robots.txt and terms; no logins, no bulk personal data.
3. For each candidate open its own site (About / Contact / Products). Capture: company, website,
   city, what they distribute, team-size hint, business email, business phone, one concrete
   observation useful for personalization (for example "sells to 200+ retailers via field reps").
4. Score 0-100 vs the ICP in SOUL.md: fit of niche (40), sales-process complexity (30),
   reachable decision-maker contact (20), recent activity signals (10). >= 60 = qualified.
5. Add every candidate to the CRM (`status=qualified` or `unqualified`, with `reason`).
6. Report to the admin: number found, top 5 by score, anything blocked by robots/terms.

## Pitfalls
- Do not guess emails (no pattern-guessing). Only use addresses published by the business.
- Prefer generic business inboxes over personal addresses when both exist.
- Cap at 30 new leads per run so quality stays high.
