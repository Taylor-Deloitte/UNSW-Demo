# Handoff: Marketing Intelligence — "Editable Query" UI

## Overview

A four-screen agent-on-top-of-stack UI for **UNSW Online / Marketing Intelligence**: the internal tool a marketing manager uses to find alumni worth talking to, diagnose cohort health, build an audience in natural language, and forecast what a campaign against that audience is worth.

The defining idea of this direction — **the query and the filters are the same object**. There is no left-hand facet rail. The sentence the user typed comes back as a row of editable tokens; clicking a token opens a menu and changing it re-runs the query. This removes the usual "which one won, the search box or the checkboxes?" ambiguity, and it keeps the agent's interpretation of a natural-language request visible and correctable.

This replaces the tab-and-right-rail chat layout in the existing `unsw-online-demo` Next.js prototype.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to copy directly. The task is to **recreate these designs in the target codebase's existing environment** using its established patterns and libraries.

The target here is the existing repo: **Next.js (App Router) + React + TypeScript + Tailwind CSS**, with data in `lib/` and `data/`. Rebuild the screens as React components in that codebase — do not port the HTML or the small runtime the prototype uses to render itself.

`support.js` is bundled only so `UNSW MI — Editable Query Prototype.dc.html` opens and runs in a browser. It is prototype scaffolding. Ignore it as an implementation reference.

## Fidelity

**High-fidelity.** Final colours, typography, spacing, borders and interaction behaviour. Recreate pixel-perfectly using the codebase's Tailwind config and component patterns. Every hex value, font size and pixel measurement in this document is the intended production value.

Note the two existing Tailwind tokens in `tailwind.config.ts` (`unsw-yellow`, `unsw-navy`) are a subset of what this design needs — see **Design tokens** for the full set to add.

---

## Global chrome

Present on all four screens, in this order, as a full-height column (`min-height: 100vh; display: flex; flex-direction: column`).

### 1. Utility strip

- Height `34px`, `flex: none`, background `#000000`, horizontal padding `36px`
- `display: flex; align-items: center; justify-content: space-between`
- Font size `12px`, colour `rgba(255,255,255,0.8)`
- Left: `Marketing Intelligence · Alumni Engagement`
- Right: a `20px`-gap row of three items
  - `Governed by UNSW policy v1.2` in `#FFD100`
  - `Audit log (11)` — clickable, `border-bottom: 1px solid rgba(255,255,255,0.4)`, toggles the audit drawer
  - `Demo · synthetic data`

### 2. Primary navigation

- Height `70px`, `flex: none`, background `#FFFFFF`, `border-bottom: 1px solid #e0e0e0`, horizontal padding `36px`
- Left group, `gap: 26px`, vertically centred:
  - UNSW wordmark, `height: 36px`, width auto
  - Tab row, `gap: 24px`, font size `15px`
    - **Inactive tab**: `font-weight: 500`, colour `#55565a`
    - **Active tab**: `font-weight: 700`, colour `#000000`, `border-bottom: 3px solid #FFD100` with `padding-bottom: 18px; margin-bottom: -21px` so the rule sits on the nav's bottom edge
    - Labels, in order: `Signals`, `Cohorts`, `Segments`, `Forecast`
- Right group, `gap: 16px`:
  - `Marketing Manager · Alumni Engagement` — `14px`, `#55565a`
  - **Save to AEP** button — background `#FFD100`, colour `#000`, `15px/700`, padding `11px 22px`, radius `0`. Hover: background `#000`, colour `#FFD100`

### 3. Query band

Appears on every screen directly under the nav. **This is the signature component** — see "The editable query band" below.

### 4. Screen body

`flex: 1; min-height: 0`. Differs per screen.

### 5. Tool footer

- Height `44px`, `flex: none`, background `#f4f4f4`, `border-top: 1px solid #e0e0e0`, padding `0 36px`, space-between
- Left: label `TOOLS USED` (`11px/700`, `letter-spacing: 0.1em`, uppercase, `#55565a`, `margin-right: 6px`) then one chip per tool call made on this screen
  - Chip: `border: 1px solid #1ac987`, colour `#0d7a54`, background `#fff`, Roboto Mono `11px`, padding `2px 8px`, radius `0`, label like `query_aep ✓`
  - Per screen: Signals `query_aep`, `query_dynamics`, `run_propensity_model` · Cohorts `query_ajo`, `compare_cohorts` · Segments `query_dynamics`, `query_aep`, `enrich_linkedin`, `run_propensity_model` · Forecast `simulate_forecast`
- Right: `Show the audit log · 11 events` / `Hide the audit log` — `13px`, `#55565a`, `border-bottom: 1px solid #8f9296`, toggles the drawer

---

## The editable query band

The component the whole direction rests on. Identical shell on all four screens; only the sentence differs.

**Container**
- `flex: none`, background `#f4f4f4`, `border-bottom: 1px solid #e0e0e0`, padding `24px 36px`
- Eyebrow: `Your query · click any part to change it` — `12px/700`, `letter-spacing: 0.14em`, `text-transform: uppercase`, colour `#55565a`
- Sentence row: `margin-top: 14px`, `display: flex; flex-wrap: wrap; align-items: center; gap: 8px`, font size `22px`, `line-height: 1.5`

**Static words** (the connective tissue: "graduates", "in the last", ", working") — colour `#55565a`, weight `400`, no background.

**Token** (editable value)
- background `#FFFFFF`, `border-bottom: 3px solid #FFD100`, padding `4px 10px`, `font-weight: 700`, colour `#000`, `cursor: pointer`, radius `0`
- Label is the current value followed by a space and `▾`
- Wrapper is `position: relative; display: inline-block` so the menu can anchor to it

**Token menu** (open state)
- `position: absolute; top: 100%; left: 0; z-index: 30`
- background `#FFFFFF`, `border: 2px solid #000`, `box-shadow: 0 12px 28px rgba(0,0,0,0.18)`, radius `0`
- `min-width` varies by content: `200–280px`
- Option row: padding `10px 14px`, font size `15px`, `cursor: pointer`; hover background `#f4f4f4`
- Only one menu open at a time. Clicking the open token closes it. Choosing an option sets the value and closes the menu.

**Add-condition affordance**
- `border: 1.5px dashed #8f9296`, colour `#8f9296`, padding `4px 12px`, font size `18px`
- Hover: `border-color: #000`, colour `#000`
- Label `+ add a condition`. Present on Signals and Segments only. Not wired in the prototype — treat as a stub.

---

## Screen 1 — Signals

**Purpose.** The always-on feed. What has happened to our alumni lately, ranked so the top of the list is where to start.

**Query sentence.** `Show [all signals ▾] from the last [30 days ▾], ranked by [confidence ▾]` + add-condition stub.

| Token | Options | Default |
| --- | --- | --- |
| scope | all signals · promotions only · role changes only · redundancy risk only | all signals |
| window | 7 days · 30 days · 90 days | 30 days |
| rank | confidence · recency · course value | confidence |

**Metric strip.** `flex: none`, `border-bottom: 1px solid #000`, six equal cells (`flex: 1`) divided by `border-left: 1px solid #e0e0e0`. First cell padding `18px 36px`, last `18px 36px 18px 12px`, middles `18px 12px`.
- Cell label `11px/700`, `letter-spacing: 0.1em`, uppercase, `#55565a`
- Cell value `32px/700`, `letter-spacing: -0.025em`
- Cells: Moments detected `1,288` · Unactioned `214` · Promoted `418` · Role change `327` · Course gap 3y+ `256` · Redundancy risk `112`
- The first two recompute from the tokens (see State management). The last four are fixed signal-type totals.

**Feed table.** Full width, `border-collapse: collapse`, `font-size: 14px`, left-aligned.
- Header row: `11px/700`, `letter-spacing: 0.1em`, uppercase, `#55565a`, `border-bottom: 1px solid #e0e0e0`, cell padding `11px 12px` (first and last `11px 36px`)
- Columns: When · Alumnus · What happened · Location · Last course · Best course fit · Confidence (right-aligned)
- Body row: `border-bottom: 1px solid #ededed`, cell padding `11px 12px` (first/last `11px 36px`), `cursor: pointer`, hover background `#f4f4f4`
- `When` is `white-space: nowrap`, `#55565a`; `Alumnus` is `font-weight: 700`; Location / Last course / Best course fit are `#55565a`; Confidence is `16px/700`, right-aligned, three decimal places

---

## Screen 2 — Cohorts

**Purpose.** Cohort-level engagement, drop-off, and the diagnosis of why a number moved.

**Query sentence.** `Compare [Mid-Career ▾] against [Recent Grads ▾] on engagement over [12 months ▾]`.

| Token | Options | Default |
| --- | --- | --- |
| cohort A | All Alumni · Recent Grads · Mid-Career · High-Signal · Dormant | Mid-Career |
| cohort B | same list | Recent Grads |
| window | 6 months · 12 months · 24 months | 12 months |

**Headline row.** `flex: none`, padding `20px 36px 16px`, `border-bottom: 1px solid #000`, space-between, `align-items: flex-end`.
- Headline `30px/700`, `letter-spacing: -0.02em`, generated: `{cohortA} engagement is {n}%, down {n}% over {window}`
- Sub `14px`, `#55565a`, `margin-top: 2px`: `{size} alumni · compared against {cohortB} ({size})`
- Right: **A/B test the template** (yellow button, `14px/700`, padding `10px 18px`) and **Revert cadence** (`border: 2px solid #000`, `14px/500`, padding `8px 16px`, hover inverts to black fill / white text)

**Body.** `flex: 1; display: flex`.
- **Chart column** `flex: 1`, padding `22px 30px 22px 36px`
  - Title row: `Engagement, rolling 30-day` (`16px/700`) and a legend (`13px`, `#55565a`) — cohort A in `#000`, cohort B in `#c8c8c8`
  - SVG `viewBox="0 0 900 200"`, `preserveAspectRatio="none"`, `width: 100%`, `flex: 1`, `min-height: 220px`, `margin-top: 12px`
    - Gridlines at y=20 and y=105, `#ededed`, `1px`; axis at y=190, `#000`, `1.5px`
    - Cohort B polyline: `#c8c8c8`, `stroke-width: 2`
    - Cohort A polyline: `#000`, `stroke-width: 3`
    - Point mapping: `x = 20 + i * (860 / (n - 1))`, `y = 190 - (value / 100) * 168`
  - Month labels below, space-between, `12px`, `#55565a`
- **Findings column** `width: 420px`, `flex: none`, `border-left: 1px solid #e0e0e0`, padding `22px 36px 22px 30px`, `gap: 18px`
  - `What the agent found` — `16px/700`, `border-bottom: 2px solid #000`, `padding-bottom: 8px`; body `16px/300`, `line-height: 1.6`, `text-wrap: pretty`
  - `ALL COHORTS` table — header `11px`, `#55565a`; rows `14px`, `border-bottom: 1px solid #ededed`, cell padding `9px 0`; columns Cohort / Size / Eng. (bold) / Δ vs Q1
  - Tool chips pinned to the bottom (`margin-top: auto`)

---

## Screen 3 — Segments *(the primary screen — start here)*

**Purpose.** Build an audience in natural language and act on it.

**Query sentence.** `[Computer Science ▾] graduates [promoted ▾] in the last [12 months ▾], working [outside Sydney ▾], with no course purchase in [3 years ▾]` + add-condition stub.

| Token | Options | Default |
| --- | --- | --- |
| study | Computer Science · Engineering · Commerce · Any field | Computer Science |
| signal | promoted · who changed role · at redundancy risk · with any signal | promoted |
| window | 6 months · 12 months · 24 months | 12 months |
| location | outside Sydney · anywhere in Australia · in regional NSW | outside Sydney |
| gap | 1 year · 3 years · 5 years | 3 years |

**Result header.** `flex: none`, padding `18px 36px 14px`, `border-bottom: 1px solid #000`, space-between, `align-items: flex-end`.
- `{matchCount} alumni matched` — `30px/700`, `letter-spacing: -0.02em`
- Sub `14px`, `#55565a`: `ranked for AI for Leaders · {n} hold email consent · 12 removed by suppression list`
- Right: three outline buttons, `gap: 10px` — **Draft AJO campaign**, **Find lookalikes**, **Forecast this segment** (this one navigates to Screen 4). Each `border: 2px solid #000`, `14px/500`, padding `9px 16px`, hover inverts.

**Result table.** Same table styling as Screen 1, cell padding `12px` (first/last `12px 36px`).
- Columns: Name (bold) · Current role · Employer · Location · Signals · Last course · Consent (`#0d7a54`) · Propensity (right, `16px/700`, three decimals)
- Final row is a single `colspan="8"` cell, padding `14px 36px`, `#55565a`: `+{n} more, median propensity 0.78`. When no rows match, it reads `No alumni in the sample match this query — widen a condition above.`

---

## Screen 4 — Forecast

**Purpose.** What is this audience worth, and which lever moves it.

**Query sentence.** `Forecast [CS grads promoted ▾] at [6.0 pts ▾] uplift, [$3,500 ▾] course value and [$8,000 ▾] of spend.`

| Token | Options | Default |
| --- | --- | --- |
| segment | CS grads promoted (340) · Leadership lookalikes (612) · Healthcare 5-year gap (288) · Dormant, high seniority (458) | CS grads promoted |
| uplift | 3 · 6 · 9 · 12 pts (rendered `6.0 pts`) | 6 |
| course value | $2,500 · $3,500 · $4,500 · $6,000 | 3500 |
| campaign cost | $4,000 · $8,000 · $14,000 · $25,000 | 8000 |

**Headline band.** `flex: none`, background `#000`, padding `30px 36px`, `display: flex; align-items: flex-end; gap: 40px`.
- Eyebrow `PROJECTED INCREMENTAL REVENUE · 12 MONTHS` — `12px/700`, `letter-spacing: 0.14em`, uppercase, `#FFD100`
- Value `A$65,415` — `80px/700`, `letter-spacing: -0.04em`, `line-height: 0.95`, `#FFFFFF`, `margin-top: 6px`
- Four stat blocks, `gap: 34px`, `padding-bottom: 14px` — label `12px/700`, uppercase, `rgba(255,255,255,0.6)`; value `34px/700`, `letter-spacing: -0.025em`, `#fff`. Enrolments · ROI · Payback · Segment.

**Body.** `flex: 1; display: flex`.
- **Chart column** `flex: 1`, padding `22px 30px 22px 36px`
  - Title `Baseline vs treated — monthly enrolments` (`16px/700`), `border-bottom: 1px solid #000`, `padding-bottom: 8px`; legend at right, `13px`, `#55565a`
  - SVG `viewBox="0 0 900 200"`, `preserveAspectRatio="none"`, `min-height: 230px`
    - Increment area: polygon of the treated line closed back along the baseline, fill `#FFD100` at `opacity: 0.5`
    - Gridline y=20 `#ededed`; axis y=190 `#000` `1.5px`
    - Baseline polyline `#8f9296`, `stroke-width: 2`, `stroke-dasharray: 7 5`
    - Treated polyline `#000`, `stroke-width: 3`
    - Point mapping: `x = 20 + i * (860 / 11)`, `y = 190 - (value / maxTreated) * 168`
  - Axis labels M+1 … M+12, `12px`, `#55565a`
- **Scenario column** `width: 460px`, `flex: none`, `border-left: 1px solid #e0e0e0`, padding `22px 36px 22px 30px`, `gap: 18px`
  - `Scenarios` — `16px/700`, `border-bottom: 2px solid #000`, `padding-bottom: 8px`
  - Scenario row: space-between, padding `10px 0`, `border-bottom: 1px solid #ededed`, `cursor: pointer`, hover `#f4f4f4`. Label `15px`; right side is revenue (`13px`, `#55565a`) then ROI (`18px/700`), `gap: 14px`. **Clicking a row applies that scenario to the tokens above and re-runs the forecast.**
  - Scenarios: Uplift 9 pts · Widen to lookalikes (612) · Premium course at $6,000 · Halve the spend to $4,000
  - `MODEL ASSUMPTIONS` — `11px/700` uppercase `#55565a`, then a `<ul>` at `13px`, `line-height: 1.7`, `#55565a`, `padding-left: 18px`
  - Pinned bottom (`margin-top: auto`): **Export the brief** (yellow, `15px/700`, padding `13px 22px`, full width, centred) and **Draft the campaign in AJO** (outline, `14px/500`, padding `11px 20px`)

---

## Audit drawer

Opened from either audit-log affordance. Overlay, not a layout shift.

- `position: fixed; top: 0; right: 0; bottom: 0; width: 420px; z-index: 60`
- background `#fff`, `border-left: 2px solid #000`, `box-shadow: -18px 0 42px rgba(0,0,0,0.16)`
- Header: background `#000`, padding `18px 24px`, space-between
  - Eyebrow `AUDIT LOG` — `11px/700`, `letter-spacing: 0.14em`, uppercase, `#FFD100`
  - Title `{n} events this session` — `20px/700`, `#fff`
  - Close `✕` — `22px`, `line-height: 1`, `cursor: pointer`
- Body: `flex: 1; overflow: auto`, padding `18px 24px`, `gap: 14px`
  - Entry: `display: flex; gap: 12px`, Roboto Mono `11px`, `line-height: 1.6`
    - time `#8f9296`, `flex: none`
    - status dot `7×7px`, `#1ac987`, `border-radius: 50%`, `margin-top: 5px`
    - tool name `12px`, `#000`, on its own line; detail `#55565a` below
- Footer: `border-top: 1px solid #e0e0e0`, padding `14px 24px`, `12px`, `#55565a`, `line-height: 1.6` — the governance sentence

---

## Interactions & behaviour

1. **Tab navigation** — clicking a nav label switches screens and closes any open token menu. No transition; instant swap.
2. **Token menu open/close** — clicking a token toggles its menu; opening one closes any other. Choosing an option writes the value and closes the menu. *Not yet implemented in the prototype and worth adding: close on outside click and on `Escape`; arrow-key navigation within the menu; `role="listbox"` / `role="option"` and `aria-expanded` on the token.*
3. **Query re-runs on change** — every token change immediately recomputes counts, table rows and charts. No explicit "search" button anywhere; the sentence *is* the control. In production, debounce and show a loading state while the agent re-plans.
4. **Scenario rows are setters** — clicking a scenario on Screen 4 patches the forecast tokens and recomputes everything, so the headline number and the chart move together.
5. **"Forecast this segment"** on Screen 3 navigates to Screen 4 carrying the segment.
6. **Hover states** — table rows `#f4f4f4`; menu options `#f4f4f4`; outline buttons invert to black fill / white text; the yellow primary button inverts to black fill / yellow text; the dashed add-condition affordance darkens to `#000`.
7. **Audit drawer** toggles from two places and closes on `✕`.
8. **Responsive** — designed for `1440×900` desktop and up; not adapted below `1280px`. The query band already wraps via `flex-wrap`. Below `1280px` the Cohorts and Forecast side columns should stack under the chart.
9. **Loading / error states** are not designed. Recommend: skeleton rows in the table body, the metric strip holding its last value at `opacity: 0.4`, and a failed tool call rendering as a red-bordered chip in the footer with the error in the audit drawer.

## State management

```
tab            0 | 1 | 2 | 3                    which screen
menu           string | null                    open token key, e.g. "q.study"
audit          boolean                          drawer visibility
feed           { scope, window, rank }          screen 1 query
cohort         { a, b, window }                 screen 2 query
q              { study, signal, window, loc, gap }   screen 3 query
fc             { segment, uplift, value, cost } screen 4 query
```

Everything else is derived at render time. Nothing is persisted.

**Screen 1 derived values.** `momentsTotal = round(1288 × windowFactor × scopeFactor)`, `momentsUnactioned = round(214 × windowFactor × scopeFactor)` where `windowFactor` = 7 days `0.24`, 30 days `1`, 90 days `2.7`; `scopeFactor` = all `1`, promotions `0.32`, role changes `0.25`, redundancy `0.09`. Feed rows filter the dataset by scope and sort by score (or by graduation year when ranked on course value).

**Screen 3 derived values.** The table filters the sample dataset for real on study, signal, Sydney-metro exclusion and last-course cutoff. The headline count is a **demo fixture**, not a count of the sample:

```
matchCount = MATCH_BASE[study] × F_SIGNAL[signal] × F_WINDOW[window] × F_LOC[loc] × F_GAP[gap]

MATCH_BASE  Computer Science 340 · Engineering 318 · Commerce 274 · Any field 1180
F_SIGNAL    promoted 1 · role change 0.78 · redundancy 0.27 · any 2.1
F_WINDOW    6 months 0.58 · 12 months 1 · 24 months 1.54
F_LOC       outside Sydney 1 · anywhere 1.62 · regional NSW 0.44
F_GAP       1 year 1.31 · 3 years 1 · 5 years 0.62
```

The default token combination yields exactly `340`, which is the number the demo narrative depends on. **Replace this whole block with a real count from the query service.**

**Screen 4 derived values.** Uses the repo's existing `computeForecast` from `lib/tab-data/forecast.ts` unchanged — do not reimplement it. Note that `baselineConversionRate` cancels out of the incremental calculation; only `segmentSize`, `upliftPct`, `courseValueAud` and `campaignCostAud` move the result. Defaults (340, 2%, 6 pts, $3,500, $8,000) produce **A$65,415**, **19 enrolments**, **718% ROI**, payback **M+3**. Payback is the first month where cumulative incremental revenue ≥ campaign cost.

## Design tokens

**Colour**

| Token | Hex | Use |
| --- | --- | --- |
| `unsw-yellow` | `#FFD100` | primary CTA fill, token underline, active-tab rule, chart increment, dark-band eyebrow |
| `ink` | `#000000` | body text, utility strip, forecast headline band, 2px emphasis borders |
| `paper` | `#FFFFFF` | page and token background |
| `mist` | `#f4f4f4` | query band, tool footer, hover fill |
| `rule` | `#e0e0e0` | structural 1px dividers |
| `rule-soft` | `#ededed` | table row dividers, chart gridlines |
| `muted` | `#55565a` | secondary text, static words in the query sentence |
| `muted-soft` | `#8f9296` | tertiary text, dashed affordance, baseline series |
| `chart-soft` | `#c8c8c8` | comparison series |
| `ok-border` | `#1ac987` | tool chip border, audit status dot |
| `ok-text` | `#0d7a54` | tool chip text, consent values |
| `unsw-navy` | `#001A2C` | retained from the existing config; not used in these screens |

**Typography.** Roboto (300, 400, 500, 700) for everything; Roboto Mono (400, 500) for tool chips, audit entries and machine values. Both via Google Fonts.

Scale in use: `11 · 12 · 13 · 14 · 15 · 16 · 17 · 18 · 20 · 22 · 26 · 30 · 32 · 34 · 80` px.
Letter-spacing: `-0.04em` on the 80px number, `-0.025em` at 32–34px, `-0.02em` at 30px, `0.1em` on 11px uppercase labels, `0.14em` on 12px uppercase eyebrows.
Line-height: `0.95` on the display number, `1.5` on the query sentence, `1.6–1.7` on body copy.

**Spacing.** Page gutter `36px`. Band padding `24px 36px`. Side-column padding `22px 36px 22px 30px`. Gaps `6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 · 26 · 34 · 40px`.

**Fixed heights.** Utility strip `34px` · nav `70px` · tool footer `44px` · audit drawer width `420px` · Cohorts side column `420px` · Forecast side column `460px`.

**Border radius.** `0` everywhere. This is deliberate and matches unsw.edu.au — do not soften it.

**Borders.** `1px solid #e0e0e0` structural · `1px solid #ededed` rows · `2px solid #000` emphasis and buttons · `3px solid #FFD100` token underline and active tab · `1.5px dashed #8f9296` add-condition.

**Shadows.** Token menu `0 12px 28px rgba(0,0,0,0.18)` · audit drawer `-18px 0 42px rgba(0,0,0,0.16)`. Nothing else casts a shadow.

## Assets

- **UNSW wordmark** — `https://www.unsw.edu.au/content/dam/images/graphics/logos/unsw/unsw_0.png`, hot-linked from UNSW's CDN in the prototype. Replace with the local brand asset in the repo (`public/unsw-logo.svg` is currently a placeholder yellow square and should be swapped for the real crest).
- **Fonts** — Roboto and Roboto Mono from Google Fonts. Self-host in production.
- **No icons.** Chevrons are the `▾` character, the close control is `✕`, tool-call success is `✓`, links use `→`. If the codebase has an icon set, substitute it and keep the sizes.
- **No photography** on these four screens. (Sibling directions in the exploration file use UNSW CDN photography; this one does not.)

## Data

The prototype ships a 14-person sample in the logic class so the filters demonstrably work. Field shape:

```
id, name, role, employer, industry, city, state, sydneyMetro (bool),
study, grad (year), signals (string[]), event, when,
lastCourse ("Mon YYYY"), consent, score (0..1)
```

Signal vocabulary: `promoted · moved · role change · course gap · redundancy risk · industry change`.
Cohorts: All Alumni 2,000 · Recent Grads 412 · Mid-Career 786 · High-Signal 344 · Dormant 458, each with a 12-point monthly engagement series.

All names, employers and figures are synthetic. Wire the real sources — Dynamics, AEP, AJO, LinkedIn enrichment — behind the same shape.

## Files

| File | What it is |
| --- | --- |
| `UNSW MI — Editable Query Prototype.dc.html` | **The hi-fi prototype.** All four screens, working token menus, live filtering and a live forecast. Open in a browser. |
| `UNSW Online - 5 Directions.dc.html` | The full exploration canvas: eight whole-product directions plus five variations of this one. Useful for the rationale behind what was rejected. This design is variation **3c**, developed from direction **2b**. |
| `support.js` | Prototype runtime. Required for the two HTML files to open. Not an implementation reference. |

## Open questions for the team

1. **The add-condition stub.** What is the full condition vocabulary, and does adding one go through the agent or a structured picker?
2. **Free-text entry.** The prototype only ever shows the parsed sentence. Where does the user type the original request — a modal, an empty-state input, or does the sentence itself become editable text on click?
3. **Ambiguous parses.** When the agent is unsure how to resolve a phrase, does the token render in a warning state, or does it ask before running?
4. **Match count.** Confirm the real query service can return a count fast enough to update on every token change, or whether the count needs its own loading state.
