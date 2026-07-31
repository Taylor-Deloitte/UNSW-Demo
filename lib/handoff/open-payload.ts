'use client';

/**
 * Open a raw payload JSON document in a new tab. Used for the Adobe / AJO
 * handoff buttons — instead of hitting a real service, we show what WOULD
 * be sent, so the audience can see the shape of the integration.
 */
export function openPayloadTab(title: string, payload: unknown): void {
  const json = JSON.stringify(payload, null, 2);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        font-family: 'Roboto Mono', ui-monospace, monospace;
        background: #f4f4f4;
        color: #000;
      }
      header {
        background: #000;
        color: #FFD100;
        padding: 18px 28px;
        border-bottom: 3px solid #FFD100;
      }
      header .eyebrow {
        font-family: 'Roboto', system-ui, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 11px;
        font-weight: 700;
      }
      header h1 {
        font-family: 'Roboto', system-ui, sans-serif;
        color: #fff;
        margin: 4px 0 0;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      header p {
        color: rgba(255,255,255,0.7);
        margin: 6px 0 0;
        font-family: 'Roboto', system-ui, sans-serif;
        font-size: 13px;
      }
      pre {
        margin: 0;
        padding: 28px;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 13px;
        line-height: 1.55;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="eyebrow">Handoff payload · preview</div>
      <h1>${escapeHtml(title)}</h1>
      <p>This is the raw payload that would post to the target system. Nothing was sent — this is a preview only.</p>
    </header>
    <pre>${escapeHtml(json)}</pre>
  </body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener');
  // Best-effort revoke — some browsers won't have opened the URL yet, so hold for a bit.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!win) {
    // Popup blocked — fall back to inline nav
    window.location.href = url;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
