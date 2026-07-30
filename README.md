# UNSW Online Demo

Structured React UI + agent-on-top-of-stack demo for the UNSW Online / lifelong-learning workshop (~2026-08-29).

## What this is

Pitch artifact showing UNSW how their dormant alumni data becomes rich prospect profiles, contextual moments-of-relevance, and actuatable segments — using an agentic layer on top of their existing stack (AEP, AJO, Dynamics, Azure). Not a rebuild, a multiplier.

Sibling to LCSP dashboard and AEO audit engine. Uses the same structured-UI + agent-panel pattern.

## Status

Scaffolding-only. Four tab shells render empty layouts, agent panel is stubbed, `api/chat` returns a canned SSE stream. Synthetic data generator is planned, not built.

## Docs

- `docs/00-SCOPE.md` — canonical spec, evolved from the playback doc
- `docs/01-DEMO-NARRATIVE.md` — click-path story for workshop day
- `docs/02-DATA-MODEL.md` — synthetic schema derived from Dimitri's CRM data model
- `docs/03-AGENT-LAYER.md` — how "agent on top of AEP/AJO/Dynamics" is faked in the demo
- `docs/04-UI-STRUCTURE.md` — tab-by-tab component breakdown

## Run

```bash
npm install
npm run dev
# open http://localhost:3000 → redirects to /alumni-insights
```

## Regenerate synthetic data

Data files under `data/` are gitignored. Regenerate them with:

```bash
npm run generate-data
# → writes data/alumni.json, prospects.json, courses.json, employers.json,
#   signals.json, propensity.json, cohorts.json, bundle.json, meta.json
```

Change the seed with `SEED=99 npm run generate-data`. Use `SMALL=1` for a
~60-alumni bundle for quick smoke tests. Full run: 2,000 alumni, 500 prospects,
~16k signals, 300k propensity rows (~98 MB total).

## Test

```bash
npm test          # single run
npm run test:watch
```

## Stack

- Next.js 16 (App Router, standalone output, Turbopack)
- React 19
- TypeScript strict, bundler module resolution (no `.js` import extensions — this is a frontend, not a Node service)
- Tailwind CSS

## Not committed

- `data/*.json` — synthetic data (gitignored until schema is finalised)
- `.env.local` — API keys
