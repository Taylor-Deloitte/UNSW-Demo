'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface PayloadState {
  show: (title: string, payload: unknown) => void;
}

const PayloadContext = createContext<PayloadState>({ show: () => {} });

export function PayloadProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<{ title: string; json: string } | null>(null);

  return (
    <PayloadContext.Provider
      value={{
        show: (title, payload) =>
          setModal({ title, json: JSON.stringify(payload, null, 2) }),
      }}
    >
      {children}
      {modal && <PayloadModal title={modal.title} json={modal.json} onClose={() => setModal(null)} />}
    </PayloadContext.Provider>
  );
}

export function usePayload() {
  return useContext(PayloadContext);
}

function PayloadModal({
  title,
  json,
  onClose,
}: {
  title: string;
  json: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 bg-ink"
        style={{ zIndex: 70, opacity: 0.5 }}
        onClick={onClose}
      />
      <div
        className="fixed flex flex-col"
        style={{
          top: '5vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(860px, 92vw)',
          maxHeight: '90vh',
          zIndex: 71,
          background: '#f4f4f4',
          border: '2px solid #000',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}
      >
        <header
          className="flex flex-none items-start justify-between bg-ink"
          style={{ padding: '18px 28px' }}
        >
          <div>
            <div
              className="uppercase text-unsw-yellow"
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}
            >
              Handoff payload · preview
            </div>
            <div
              className="text-white"
              style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}
            >
              {title}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 }}>
              This is the raw payload that would post to the target system. Nothing was sent; this
              is a preview only.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-white"
            aria-label="Close"
            style={{ fontSize: 22, lineHeight: 1, marginLeft: 24, flexShrink: 0 }}
          >
            ✕
          </button>
        </header>
        <pre
          className="font-mono overflow-auto"
          style={{
            margin: 0,
            padding: 28,
            fontSize: 13,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            flex: 1,
            minHeight: 0,
          }}
        >
          {json}
        </pre>
      </div>
    </>
  );
}
