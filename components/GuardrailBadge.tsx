export function GuardrailBadge({
  label,
  tone = 'ok',
}: {
  label: string;
  tone?: 'ok' | 'warn';
}) {
  const cls =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ' +
        cls
      }
    >
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
        <path d="M6 0l1.5 2.5L10 4l-2 2 .5 3L6 7.5 3.5 9 4 6 2 4l2.5-1.5L6 0z" />
      </svg>
      {label}
    </span>
  );
}
