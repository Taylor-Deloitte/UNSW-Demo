# 03 — Agent Layer

How "agent on top of AEP/AJO/Dynamics" is faked in the demo, and how to swap the fake for real later.

## The premise (what we're selling)

The agentic layer sits on top of UNSW's existing stack. Every read/write looks like it hits Dynamics + AEP. Source of truth stays there. Agents hold **context and memory**; they don't hold data.

In production this would be:
- **Read path:** agent → tool call → Dynamics Web API / AEP Query Service / SIMS API
- **Write path:** agent → tool call → AEP Segment API, AJO campaign draft API, Dynamics activity create
- **Runtime:** Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) with per-session persistence and streaming
- **Context tiers:** system prompt → domain knowledge → schema YAML per data source → session state

In the demo this is all faked. What matters is that it *looks and feels* like the real thing.

## What the demo actually does

- `POST /api/chat` — an SSE route that streams a canned response. Structure matches what a real Claude Agent SDK stream would emit (`stream_event` → `text_delta`, plus `tool_use` blocks for the "querying Dynamics", "querying AEP" moments)
- `AgentPanel` — right-hand chat pane. Renders streamed text + tool-use pills
- Per tab, a small set of scripted prompts + responses that the demo assumes the presenter will use. If the audience asks a different question, the agent falls back to a generic "I'll get back to you" — presenter should steer

## Streaming event shape

Matches the LCSP `AgentEvent` model so a future migration is trivial. The SSE stream emits JSON objects, one per line:

```json
{"type": "text_delta", "delta": "Looking across Dynamics..."}
{"type": "tool_use", "tool": "query_dynamics", "input": {"entity": "Lead", "filters": {...}}}
{"type": "tool_result", "tool": "query_dynamics", "output": {"rows": 340}}
{"type": "text_delta", "delta": "I found 340 alumni matching..."}
{"type": "done"}
```

## Tool-use pills (what appears in the chat)

The demo shows agent "tool use" as pills so the audience can see the agent talking to their systems. Pills the demo needs:

- `query_dynamics` — "Querying Dynamics 365 (Leads, Contacts, Opportunities)"
- `query_aep` — "Querying AEP profiles + audiences"
- `query_linkedin` — "Enriching with LinkedIn signals"
- `create_aep_segment` — "Creating segment in AEP"
- `draft_ajo_campaign` — "Drafting campaign brief for AJO"
- `run_propensity_model` — "Running propensity model"

Each pill has an animated "thinking" state → "done" state with a green check. Pure theatre, but load-bearing theatre.

## What to build for a real agent later

When we're ready to wire a real agent (post-workshop, if UNSW says yes):

1. Swap the canned `route.ts` for a Claude Agent SDK `query()` with `persistSession: true`
2. Register MCP tools via `createSdkMcpServer()` for each of the tool pills above
3. Each MCP tool is a thin wrapper over the corresponding real API (Dynamics Web API, AEP Query Service, LinkedIn API, AEP Segment API, AJO Campaign API)
4. Add zod validation at the tool boundary
5. Add a `hooks/pre-tool-use-*.ts` guard for anything that writes

**Do not** hand-roll the conversation history — the SDK owns session state.

## Non-goals for the demo agent layer

- **No real Claude API calls.** Zero cost, works offline, deterministic for demo day
- **No streaming of thinking blocks.** Adds complexity without payoff for a scripted demo
- **No multi-turn reasoning.** Scripted prompt → scripted response
- **No memory across sessions.** Every page refresh starts clean

## Files (planned)

- `app/api/chat/route.ts` — SSE endpoint, canned responses per tab
- `lib/agent-scripts.ts` — the canned prompts + responses for each tab
- `components/AgentPanel.tsx` — right-hand chat pane
- `components/AgentToolPill.tsx` — the tool-use pill component with animated state
