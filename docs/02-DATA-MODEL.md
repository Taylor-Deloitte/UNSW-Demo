# 02 — Data Model

Synthetic data schema for the demo, adapted from Dimitri's `CRM Data Model.xlsx` (2026-07-30). The source spreadsheet is the Dynamics 365 recruitment CRM for **undergrad / postgrad leads** — not lifelong-learning cohorts, but the same underlying stack. We reuse the tables, rename them for the lifelong-learning context, and add three demo-only enrichment tables.

**Source file:** `C:\Users\thobbs\Downloads\CRM Data Model.xlsx` (43 sheets)
**Copy to keep in repo:** `data/schema/CRM Data Model.xlsx` (add when needed — currently gitignored to avoid committing an external asset)

## Table mapping (CRM → lifelong learning)

| CRM table (source) | Demo entity | Purpose |
|---|---|---|
| Lead (`1.1`) | **Prospective Learner** | Alumni not yet engaged with UNSW Online. The "dormant asset" — enriched with LinkedIn-style signals |
| Contact (`1.2`) | **Alumni** | Anyone with a completed UNSW qualification. May or may not be a prospect for a specific course |
| Account (`1.3`) | **Employer** | Where the alumni currently work — used for cohort filters ("CS grads working outside Sydney") |
| Opportunity (`1.4`) | **Course Purchase Opportunity** | Prospective purchase of a micro-credential / short course |
| Application (`3.0`) | **Enrolment** | Actual enrolment record |
| Program (`3.3`) | **Course / Micro-credential** | Product catalogue |
| Education History (`3.5`) | **Alumni Education** | Past UNSW + external education. Key for lifecycle enrichment |
| Marketing Communications (`4.0`) | **Marketing Touchpoint** | Email / SMS / push events from AJO |
| Event (`9.0`) | **Learning Event** | Webinars, taster classes, alumni events |
| Event Attendee (`9.1`) | **Event Attendance** | RSVPs + attendance |
| Task / Phone Call / Email / Appointment (`6.x`) | **Activity** | Sales rep + agent-generated activities |
| Case (`7.0`) | **Enquiry** | Alumni enquiries about courses / careers |
| Lead Learner Persona | **Learner Persona** | Current-status segmentation (mid-career, career-switcher, etc.) |
| Lead Needscope Persona | **Needscope Persona** | Motivation-based segmentation |
| Country / Region / Postcode / Time Zone | Reference tables — unchanged |

## Demo-only tables (not in CRM source)

These are enrichment stores that don't exist in the source CRM. In production these would be a mix of LinkedIn API pulls, UNSW-owned event data, and derived signal tables.

- **`career_trajectory`** — LinkedIn-style role history per alumni: `{alumni_id, role, company, industry, start_date, end_date, seniority_level}`
- **`career_signal`** — atomic signal events: `{alumni_id, signal_type, detected_at, source, confidence, payload_json}`. Signal types: `promoted`, `role_change`, `industry_change`, `location_change`, `redundancy_risk`, `course_recency_threshold`, `alumni_anniversary`
- **`propensity_score`** — per (alumni, product) score: `{alumni_id, product_id, score, model_version, computed_at, features_json}`

## Volume for the demo

Target: enough to feel real without slowing the browser.

- ~2,000 Alumni (Contacts)
- ~500 Prospective Learners (Leads — subset who match a target segment)
- ~150 Courses / Micro-credentials
- ~8,000 career_signal events across the alumni base
- ~5 default cohorts precomputed for the Lifecycle Health tab

## Generation strategy

1. **Seed data:** Australian names + address distributions, industry weights (heavy tech / finance / gov / health for a Sydney-centric alumni base)
2. **Career trajectory generator:** per alumni, generate 2–5 roles between graduation date and now, with plausible progression (junior → senior → lead → manager)
3. **Signal generator:** derive signals from trajectory + random events; bias toward the last 12 months so the demo has recent signals to point at
4. **Propensity generator:** simple heuristic (recency, seniority, industry-match to course) + noise, so the top-of-list makes narrative sense

Store as JSON files in `data/` (gitignored). Loaders in `lib/data.ts` (to be written).

## Key fields per entity (subset — full field lists in the source spreadsheet)

### Prospective Learner (from Lead, 129 fields)
Kept for demo: `Lead ID`, `First Name`, `Last Name`, `Primary Email`, `LinkedinURL`, `Current Company`, `Job Title`, `Industry`, `Address 1 City`, `Address 1 State`, `Country of Residence`, `Lead Learner Persona`, `Lead Needscope Persona`, `Lead Rating`, `Lead Source`, `Lead Source Type`, `Lead Status`, `Interested in Delivery Mode`, `Interested in Program Type`, `Highest Level of Education`, `Level of Employment`

### Alumni (from Contact, 105 fields)
Kept for demo: `Contact ID`, `CRM ID`, `First Name`, `Last Name`, `Primary Email`, `LinkedinURL`, `Current Company`, `Job Title`, `Country of Residence`, `Address 1 City/State`, plus the same persona lookups

### Course Purchase Opportunity (from Opportunity)
Kept: `Opportunity ID`, `Contact` (lookup), `Program` (lookup), `Stage`, `Estimated Close Date`, `Estimated Revenue`, `Actual Close Date`, `Won / Lost Reason`

### Course / Micro-credential (from Program)
Kept: `Program Code`, `Program Name`, `Primary Faculty`, `Field of Study`, `Delivery Mode`, `Duration`, `Price`

### Alumni Education (from Education History)
Kept: `Education History ID`, `Contact` (lookup), `Completed UNSW Program Name`, `Completed Non UNSW Program Name`, `Graduation Year`, `Field of Study`

### Marketing Touchpoint (from Marketing Communications)
Kept: `Communication ID`, `Message ID`, `Channel Type` (WeChat / WhatsApp / SMS / Email / Push), `Contact` (lookup), `Send Date`, `Open Date`, `Click Date`, `Campaign ID`

## Ambiguities to resolve before shipping the demo

- **SIMS API exposure** — which fields flow from SIMS vs. are captured in CRM only. Dimitri to clarify. Marked in source spreadsheet as "From SIMS"
- **Lead Learner Persona values** — the sheet has the table structure but not the persona list. Will invent plausible ones for the demo (Career Switcher, Skills Upgrader, Returner, Advancement Seeker) and flag as illustrative
- **Lead Needscope Persona values** — same
- **LinkedIn enrichment schema** — no source-of-truth in the spreadsheet. `career_trajectory` shape is our invention; validate with India team when they confirm API access

## Explicit non-goals for the synthetic data

- **No real customer data.** Ever. Even for shape testing
- **No exported Snowflake / Dynamics samples** committed to the repo
- **No PII beyond synthetic**. If we generate LinkedIn URLs, they point to fake handles that 404
