# 04 — UI Structure

Tab-by-tab component breakdown. Same shell as LCSP dashboard: left sidebar nav, main content, right agent panel.

## App shell (all tabs)

```
+----------------------------------------------------------+
|  UNSW Online  |  Marketing Intelligence                  |
+---------------+------------------------+-----------------+
| [ Alumni     ]|                        |                 |
|   Insights   ||    <TAB CONTENT>       |  Agent Panel    |
| [ Lifecycle  ]|                        |  (chat + tool   |
|   Health     ||                        |   pills)        |
| [ Segmentation|                        |                 |
|   + Campaign ]|                        |                 |
| [ Forecast   ]|                        |                 |
+---------------+------------------------+-----------------+
```

Files:
- `app/layout.tsx` — root shell, wraps `<AppShell>`
- `components/AppShell.tsx` — sidebar + header + right-side agent panel slot
- `components/AgentPanel.tsx` — persistent across tab navigation
- `lib/brand.ts` — UNSW colours, logo path, font stack

## Tab 1 — Alumni Insights (`/alumni-insights`)

**Purpose:** show individual alumni with career trajectory + signals; let the presenter run a natural-language search.

Components:
- `AlumniFilterBar` — chips: industry, cohort year, signal type, location
- `AlumniGrid` — grid of `AlumniCard`
- `AlumniCard` — photo, name, current role, current employer, 3 most recent trajectory events, active signal badges
- `AlumniDetailDrawer` — click a card → drawer with full trajectory + all signals

Agent panel prompts (canned):
- *"Who's a good target for the AI for Leaders certificate right now?"*
- *"Show me alumni who changed roles in the last 90 days"*
- *"Which industries are showing the most disruption signals?"*

## Tab 2 — Lifecycle Health (`/lifecycle-health`)

**Purpose:** cohort-level view; the always-on agent's report card.

Components:
- `CohortSelector` — tabs across the top: All / Recent Grads / Mid-Career / High-Signal / Dormant
- `CohortKPIs` — 4 KPI tiles: size, engagement rate, moments-of-relevance detected (30d), drop-off rate
- `EngagementTrendChart` — line chart, 12-month rolling
- `AgentCommentaryCard` — agent-generated narrative + recommendations, one per cohort

Agent panel prompts (canned):
- *"Why did mid-career engagement drop in June?"*
- *"Which cohort should we prioritise this quarter?"*

## Tab 3 — Segmentation + Campaign (`/segmentation`)

**Purpose:** the Marvin moment. Natural language → segment → campaign brief.

Components:
- `SegmentPromptInput` — large text area with a "Build segment" button
- `AgentPlanCard` — agent's plan of what it's about to do (which tables in Dynamics + AEP, which enrichment)
- `SegmentResultTable` — columns: name, current role, employer, signals fired, propensity score, reasoning
- `SegmentActionsBar` — "Send to AEP" / "Draft AJO campaign" / "Refine segment" / "Find lookalikes"
- `SegmentConfirmModal` — mock confirmation of AEP segment created + AJO brief drafted

Agent panel prompts (canned):
- The full segment-building example from the demo narrative
- Follow-up: *"Now find me people who look like our leadership-cert buyers"*

## Tab 4 — Forecast / Incrementality (`/forecast`)

**Purpose:** close the loop with a $ number.

Components:
- `SegmentContextCard` — which segment we're forecasting for (from Tab 3, or standalone selector)
- `ForecastChart` — baseline vs. treated over 12 months
- `AssumptionSliders` — conversion rate (%), average course value ($), campaign cost ($)
- `IncrementalRevenueTile` — big-number result
- `ModelAssumptionsPanel` — cluster method, features used, honest "this is a mock" caveat

Agent panel prompts (canned):
- *"What would double the ROI here?"*
- *"How would this change if we ran the campaign in Q4 instead?"*

## Empty states (initial scaffolding)

Every tab starts as a `<EmptyState>` component with:
- Tab title
- One-line description (from the scope doc)
- Placeholder box that says "components go here"

This lets us verify the shell + routing + agent panel work end-to-end before building any content.

## Not built yet (in scaffolding phase)

- All the components listed above
- Chart library choice (recharts probably — matches LCSP)
- Any real data wiring
- Agent panel visual polish (starts as a simple chat)
