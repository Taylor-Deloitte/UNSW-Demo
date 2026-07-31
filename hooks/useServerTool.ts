'use client';

import { useCallback, useRef } from 'react';
import { logToolCall, updateToolStatus } from '../lib/agent/audit-log';

let counter = 0;
function nextId(): string {
  counter += 1;
  return `local-${Date.now()}-${counter}`;
}

/**
 * Call an MCP tool via /api/tool/[name]. Logs to the client audit log
 * so the audit drawer + nav counter update in real time. Returns the
 * parsed result or throws.
 */
export function useServerTool() {
  const inFlight = useRef(new Map<string, AbortController>());

  const call = useCallback(async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
    const id = nextId();
    logToolCall({
      id,
      tool: name,
      inputPreview: JSON.stringify(body).slice(0, 80),
      status: 'running',
    });

    // Cancel any previous in-flight call for this tool name (debounces token thrash)
    inFlight.current.get(name)?.abort();
    const controller = new AbortController();
    inFlight.current.set(name, controller);

    try {
      const res = await fetch(`/api/tool/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        updateToolStatus(id, 'error');
        throw new Error(`tool ${name} failed: ${res.status}`);
      }
      const json = (await res.json()) as T;
      updateToolStatus(id, 'done');
      return json;
    } catch (err) {
      // AbortError happens when we cancel; don't flag as error
      if ((err as { name?: string }).name !== 'AbortError') {
        updateToolStatus(id, 'error');
      }
      throw err;
    } finally {
      if (inFlight.current.get(name) === controller) {
        inFlight.current.delete(name);
      }
    }
  }, []);

  return { call };
}
