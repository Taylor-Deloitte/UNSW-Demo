'use client';

export interface ToolChip {
  name: string;
  status?: 'ok' | 'error';
}

export function ToolFooter({
  chips,
  onToggleAudit,
  auditOpen,
  auditCount,
}: {
  chips: ToolChip[];
  onToggleAudit: () => void;
  auditOpen: boolean;
  auditCount: number;
}) {
  return (
    <div
      className="flex flex-none items-center justify-between bg-mist"
      style={{ height: 44, padding: '0 36px', borderTop: '1px solid #e0e0e0' }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        <span
          className="uppercase text-muted"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            marginRight: 6,
          }}
        >
          Tools used
        </span>
        {chips.map((chip) => (
          <span
            key={chip.name}
            className="font-mono bg-paper"
            style={{
              border: '1px solid #1ac987',
              color: '#0d7a54',
              fontSize: 11,
              padding: '2px 8px',
            }}
          >
            {chip.name} ✓
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onToggleAudit}
        className="text-muted"
        style={{ fontSize: 13, borderBottom: '1px solid #8f9296' }}
      >
        {auditOpen ? 'Hide the audit log' : `Show the audit log · ${auditCount} events`}
      </button>
    </div>
  );
}
