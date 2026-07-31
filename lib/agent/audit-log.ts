export interface AuditEntry {
  id: string;
  timestamp: string;
  tool: string;
  inputPreview: string;
  status: 'running' | 'done' | 'error';
}

type Listener = (entries: AuditEntry[]) => void;

const entries: AuditEntry[] = [];
const listeners = new Set<Listener>();
const MAX_ENTRIES = 200;

export function logToolCall(entry: Omit<AuditEntry, 'timestamp'>): void {
  const full: AuditEntry = { ...entry, timestamp: new Date().toISOString() };
  entries.push(full);
  while (entries.length > MAX_ENTRIES) entries.shift();
  notify();
}

export function updateToolStatus(id: string, status: AuditEntry['status']): void {
  const found = entries.find((e) => e.id === id);
  if (!found) return;
  found.status = status;
  notify();
}

export function getEntries(): AuditEntry[] {
  return entries.slice();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  const snapshot = entries.slice();
  for (const l of listeners) l(snapshot);
}
