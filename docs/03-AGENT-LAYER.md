# 03 — Agent Layer

How "agent on top of AEP/AJO/Dynamics" is wired in the demo, and what maps to real vs. mock.

## The premise (what we're selling)

The agentic layer sits on top of UNSW's existing stack. Every read/write looks like it hits Dynamics + AEP. Source of truth stays there. Agents hold **context and memory**; they don't hold data.

In production this would be:
- **Read path:** agent → tool call → Dynamics Web API / AEP Query Service / SIMS API
- **Write path:** agent → tool call → AEP Segment API, AJO campaign draft API, Dynamics activity create
- **Runtime:** Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) with per-session persistence and streaming
- **Context tiers:** system prompt → domain knowledge → schema YAML per data source → session state

## Actual runtime (plan #2, shipped)

Real Claude Agent SDK. Not canned any more.

- **`app/api/chat/route.ts`** — SSE endpoint. Calls `query()` from `@anthropic-ai/claude-agent-sdk` with:
  - `systemPrompt` from `lib/agent/system-prompt.ts`
  - Six MCP tools registered in-process via `createSdkMcpServer()` (see `lib/agent/mcp-server.ts`)
  - `includePartialMessages: true` for token-level streaming
  - `resume: sessionId` on follow-up turns to preserve context server-side
  - Model default `claude-opus-4-7`, override via `ANTHROPIC_MODEL` env var
- **`lib/agent/mcp-server.ts`** — MCP server factory. Each tool is a thin `tool()` wrapper (zod-validated) over the pure functions in `lib/agent/mcp-tools/*`.
- **`lib/agent/mcp-tools/*`** — the six tools. All pure functions over the `DataBundle` loaded via `lib/data.ts`:
  - `query_dynamics` — filters alumni + prospects
  - `query_aep` — same underlying data, AEP-framed audience response
  - `query_linkedin` — signals by alumni or by signal type
  - `create_aep_segment` — mock write to session-scoped store
  - `draft_ajo_campaign` — mock write to session-scoped store
  - `run_propensity_model` — reads propensity scores, top-N with fuzzy course match
- **`lib/agent/map-sdk-events.ts`** — maps Claude Agent SDK stream messages → our `AgentEvent` union (`text_delta`, `tool_use`, `tool_result`, `session_started`, `done`, `error`).
- **`lib/agent/session-store.ts`** — in-memory LRU (max 100 sessions) for segments + campaigns created during a session.
- **`hooks/useAgentChat.ts`** — client consumer of the SSE stream. Maintains message history + tool-call state, threads `sessionId` back for resume.
- **`components/AgentPanel.tsx`** — right-hand chat pane. Uses `useAgentChat`.

## What's real vs. mock

| Concern | Status |
|---|---|
| Claude API calls | **Real** — requires `ANTHROPIC_API_KEY` |
| Streaming (text + tool_use) | **Real** — token-level via `includePartialMessages` |
| Session persistence | **Real** — SDK-managed via `resume: sessionId` |
| MCP tools (read) | **Real** — but read from synthetic JSON, not Dynamics/AEP |
| MCP tools (write) | **Mock** — segments and campaigns land in `session-store.ts`, not AEP/AJO |
| System prompt tuning | **Real** — see `lib/agent/system-prompt.ts` |

## Streaming event shape

SSE stream emits JSON objects, one per `data:` line:

```json
{"type": "session_started", "sessionId": "sess_..."}
{"type": "text_delta", "delta": "Looking across Dynamics..."}
{"type": "tool_use", "tool": "query_dynamics", "input": {...}, "toolUseId": "toolu_..."}
{"type": "tool_result", "tool": "unknown", "output": {...}, "toolUseId": "toolu_..."}
{"type": "text_delta", "delta": "I found 340 alumni matching..."}
{"type": "done"}
```

**Known limitation:** `tool_result` events carry `tool: 'unknown'` because the SDK doesn't echo the tool name on results. The client correlates by `toolUseId` — the tool-pill UI still flips from "running" to "done" correctly, but if you want the payload inspectable by tool name in the browser, extend the mapper to track `toolUseId → toolName` server-side.

## Tool-use pills (what appears in the chat)

Rendered by `AgentPanel.tsx`. Each pill starts pulsing on `tool_use`, flips to a green check on `tool_result` (matched by `toolUseId`). Names:

- `query_dynamics` — "Querying Dynamics 365"
- `query_aep` — "Querying AEP profiles"
- `query_linkedin` — "Enriching with LinkedIn signals"
- `create_aep_segment` — "Creating segment in AEP"
- `draft_ajo_campaign` — "Drafting campaign brief for AJO"
- `run_propensity_model` — "Running propensity model"

## What to build later (post-workshop)

If UNSW says yes and we're wiring real integrations:

1. Swap the pure functions in `lib/agent/mcp-tools/` for real API clients (Dynamics Web API, AEP Query Service, LinkedIn API, AEP Segment API, AJO Campaign API)
2. Add `hooks/pre-tool-use-*.ts` guards for anything that writes (currently unnecessary because writes only mutate session state)
3. Move the session store from in-memory to Redis / Postgres for multi-instance deployments
4. Replace the placeholder `pending-<timestamp>` sessionId in `route.ts` with a proper "wait for session_started before running tools" pattern (see the known limitation in the plan doc)
5. Add per-user auth so `sessionId` maps to a UNSW user, not just a browser session

## Non-goals for the demo runtime

- **No permission policies** on tool use (`always_ask`) — could add for the "governance is visible" pitch story, TBD per tab
- **No compaction / context editing** — demo conversations are short
- **No hooks-based write gating** — mock writes only touch session state

## Files

- `app/api/chat/route.ts` — SSE endpoint
- `lib/agent/events.ts` — `AgentEvent` union + narrowing helpers
- `lib/agent/system-prompt.ts` — the system prompt text
- `lib/agent/mcp-server.ts` — MCP server factory
- `lib/agent/mcp-tools/*.ts` — the six tool implementations (pure functions)
- `lib/agent/map-sdk-events.ts` — SDK message → `AgentEvent` mapper
- `lib/agent/session-store.ts` — in-memory LRU session store
- `hooks/useAgentChat.ts` — client SSE consumer
- `components/AgentPanel.tsx` — chat pane
