# 01 — Demo Narrative

Click-path story for workshop day. Roughly 8–10 minutes end-to-end, four beats.

## Opening framing (30 sec, verbal)

> "UNSW Online sits on decades of alumni data — where they went, what they studied, where they are now. That data is mostly dormant. We're going to show you what happens when an agentic layer sits on top of your existing Dynamics + AEP + AJO stack and starts using that data. Nothing on screen is a new system. Every action still goes to your systems of record."

## Beat 1 — Alumni Insights (2 min)

**Setup:** land on `/alumni-insights`. Grid of alumni cards, LinkedIn-style trajectory.

**Click path:**
1. Point at three cards showing recent career signals ("promoted to Head of Data 6 weeks ago", "moved from Sydney to Melbourne", "5 years since last UNSW course")
2. Show the filter chips (industry, cohort year, signal type) — mention they're familiar but not the point
3. Ask the agent panel: *"Who's a good target for the AI for Leaders certificate right now?"*
4. Agent returns 8 alumni with reasoning per row (why this person, which signal fired)

**Payoff line:** *"The signals are always on. Marketing didn't build this list — the agent surfaced it."*

## Beat 2 — Lifecycle Health (1.5 min)

**Setup:** navigate to `/lifecycle-health`. Cohort dashboard.

**Click path:**
1. Show the four default cohorts (recent grads, mid-career, high-signal, dormant)
2. Point at the "mid-career engagement dip" trend line
3. Read the agent-generated commentary underneath: *"Engagement in mid-career dropped 22% after cadence changed on 12 June. Recommend reverting or A/B-testing the new template."*

**Payoff line:** *"The agent is the always-on analyst you don't have to staff."*

## Beat 3 — Segmentation + Campaign (3 min — the Marvin moment)

**Setup:** navigate to `/segmentation`. Empty state with a prompt input.

**Click path:**
1. Type the demo prompt: *"CS graduates promoted in the last 12 months, working outside Sydney, no course purchases in 3 years"*
2. Agent shows its plan (which tables in Dynamics + AEP it will hit, what enrichment it will apply)
3. Result: audience of ~340, propensity score per row, reasoning column
4. Follow-up: *"Now find me people who look like our leadership-cert buyers"* — lookalike expansion
5. Click "Send to AEP" — mock confirmation modal shows segment created in AEP + campaign brief drafted for AJO

**Payoff line:** *"This is a four-week data process compressed to four minutes — the same pattern we shipped for [Marvin flybys](../../marvin/README.md) on Snowflake."*

## Beat 4 — Forecast / Incrementality Closer (1.5 min)

**Setup:** navigate to `/forecast`. Segment from Beat 3 auto-loaded.

**Click path:**
1. Show projected uplift chart: baseline vs. treated
2. Sliders for conversion rate (X%) and average course value (Y)
3. Big number: *"$Z incremental annual revenue"*
4. Point at the "Model assumptions" panel — cluster-based, honest about being a mock

**Payoff line:** *"Not real numbers. But this is the shape of the model that would sit behind every campaign decision."*

## Closer (verbal, 30 sec)

> "None of this replaces what you have. It sits on top of it. The agents hold context and memory — the data stays in Dynamics, AEP, AJO. That's the pattern we want to build with you."

## Handoff to Damon

Damon's Deloitte Labs "agents as first-class citizens" demo picks up here — voice-driven command centre, named agent team members. Different repo, different medium.
