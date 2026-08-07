'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface TokenOption {
  value: string;
  label: string;
}

export function QueryBand({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex-none bg-mist"
      style={{ padding: '24px 36px', borderBottom: '1px solid #e0e0e0' }}
    >
      <div
        className="uppercase text-muted"
        style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em' }}
      >
        Your query · click any part to change it
      </div>
      <div
        className="flex flex-wrap items-center"
        style={{ marginTop: 14, gap: 8, fontSize: 22, lineHeight: 1.5 }}
      >
        {children}
      </div>
    </div>
  );
}

/** Static connective tissue in the query sentence. */
export function QueryStatic({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted" style={{ fontWeight: 400 }}>
      {children}
    </span>
  );
}

/** Editable token. Renders as pill with yellow underline. Menu opens below on click. */
export function QueryToken({
  value,
  options,
  onChange,
  minWidth = 200,
}: {
  value: string;
  options: TokenOption[];
  onChange: (v: string) => void;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer bg-paper text-ink"
        aria-expanded={open}
        style={{
          padding: '4px 10px',
          fontWeight: 700,
          borderBottom: '3px solid #FFD100',
        }}
      >
        {currentLabel} ▾
      </button>
      {open && (
        <div
          className="absolute bg-paper"
          role="listbox"
          style={{
            top: '100%',
            left: 0,
            zIndex: 30,
            border: '2px solid #000',
            boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
            minWidth,
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="block w-full cursor-pointer text-left hover:bg-mist"
              style={{ padding: '10px 14px', fontSize: 15 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/** Small × button to remove an added condition. */
export function RemoveConditionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-soft hover:text-ink"
      aria-label="Remove condition"
      style={{ fontSize: 16, lineHeight: 1, padding: '0 2px' }}
    >
      ×
    </button>
  );
}

/**
 * "+ add a condition" affordance.
 * When `available` is non-empty, clicking opens a picker menu.
 * When all condition types are already added, renders nothing.
 */
export function AddConditionStub({
  available = [],
  onAdd,
}: {
  available?: Array<{ type: string; label: string }>;
  onAdd?: (type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  if (!available.length) return null;

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer text-muted-soft hover:border-ink hover:text-ink"
        style={{ border: '1.5px dashed #8f9296', padding: '4px 12px', fontSize: 18 }}
      >
        + add a condition
      </button>
      {open && (
        <div
          className="absolute bg-paper"
          style={{
            top: '100%',
            left: 0,
            zIndex: 30,
            border: '2px solid #000',
            boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
            minWidth: 220,
          }}
        >
          {available.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                onAdd?.(opt.type);
                setOpen(false);
              }}
              className="block w-full cursor-pointer text-left hover:bg-mist"
              style={{ padding: '10px 14px', fontSize: 15 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
