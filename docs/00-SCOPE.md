# 00 — Scope

Canonical spec for the UNSW Online demo. Evolved from the playback doc (`UNSW Online Demo - Playback.docx`, 2026-07-30). This file supersedes the docx — treat any conflict as the docx being wrong.

## Thesis

UNSW Online's dormant alumni data is the biggest untapped asset in the online-learning business. An agentic layer on top of the existing stack (AEP, AJO, Dynamics, Azure) turns that data into:

1. Rich prospect profiles (alumni → prospective lifelong learners)
2. Contextual moments-of-relevance (career signals → course triggers)
3. Segments the marketing team can actuate in minutes, not weeks

Framing: **the agentic layer is the addition, not a replacement**. Every read/write in the demo looks like it hits Dynamics + AEP; source of truth stays there.

## Constraints

- **Do NOT** tell UNSW what courses to offer (their domain, we'll get it wrong)
- **Do NOT** propose a business restructure
- **DO** show dormant alumni data → rich prospect data → actionable segments
- Agentic layer sits *on top of* existing stack — never replaces flows
- Agents hold context + memory; source of truth stays in AEP / AJO / Dynamics

## In scope for the demo

Four tabs, one agent panel.

### Tab 1 — Alumni Insights
- LinkedIn-style career trajectory (title changes, promotions, industry moves)
- Signals surfaced by the lifecycle agent ("promoted in last 90 days", "industry disruption event", "5 years since last course")
- Filterable, but the primary interaction is natural-language: *"who's a good target for the leadership certificate right now"* → shortlist + reasoning

### Tab 2 — Lifecycle Health
Cohort-level view, the always-on agent's report card.
- Cohort definitions (recent grads, mid-career, high-signal alumni)
- Engagement, drop-off, moments-of-relevance detected per cohort
- Trend lines + agent-generated commentary (*"engagement in the mid-career cohort dipped after email cadence changed — recommend X"*)

### Tab 3 — Segmentation + Campaign
Marvin pattern applied to UNSW. Natural-language segment building across Dynamics + AEP.
- Example: *"CS graduates promoted in the last 12 months, working outside Sydney, no course purchases in 3 years"*
- Agent plans the query, executes across Dynamics + AEP (+ enrichment sources), returns the audience with propensity scoring + reasoning
- One click → creates the segment back in AEP, drafts a campaign brief for AJO
- Lookalike modelling — *"find me people who look like our leadership-cert buyers"*

### Tab 4 — Forecast / Incrementality Closer
- Given segment + campaign, mock projected uplift with an incrementality view
- *"If you convert X% of this cohort at Y average course value, that's $Z in incremental annual revenue"*
- Not real data, but the shape of a real model — cluster/propensity-based, honest about assumptions

## Out of scope for the demo

- Philanthropy / donation targeting (parked — same analytical approach, different conversation)
- B2B / enterprise learning (mentioned in scoping, not led with)
- Multimodal voice command centre (Damon's separate Labs demo — not in this repo)
- Career-advisor agent (*"students like you are doing this next"*) — flag as extension
- Commerce monetisation of UGC courses (position as future-state, not built)
- Real Dynamics / AEP integration (agent layer is faked; see `03-AGENT-LAYER.md`)

## Data assumptions

- Synthetic throughout, shaped from Dimitri's real CRM data model (`docs/02-DATA-MODEL.md`)
- Enrichment signals (LinkedIn-style) simulated; production would use LinkedIn API (India team pending) + UNSW-owned signal sources
- Anything from SIMS is stubbed pending Dimitri's clarity on API exposure
- Alumni portal login (via Alvin) = current-state reference for IA + language

## Roles + parallel workstreams

- **Taylor** — this repo, structured React UI
- **Damon** — Deloitte Labs "agents as first-class team members" pattern (separate)
- **Dimitri** — CRM data model (shared, see `02-DATA-MODEL.md`), Adobe alignment with Akshar
- **Alvin** — current alumni portal login
- **Hannah** — market research on online learning business models
- **India team** — UNSW LinkedIn API access

## Success criteria for the demo

- The four tabs each tell one crisp story in <2 minutes
- The Segmentation tab lands the "Marvin moment" — natural language → executable segment in seconds
- The Forecast tab closes with a plausible $ number tied to an obviously fake but reasonable model
- Nothing on screen implies we're proposing a stack change
