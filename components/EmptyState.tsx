export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-unsw-navy">{title}</h1>
        <p className="mt-1 text-unsw-slate">{description}</p>
      </header>
      <div className="rounded-xl border border-dashed border-unsw-navy/20 bg-white px-6 py-12 text-center text-unsw-slate">
        Components go here — see <code className="text-unsw-navy">docs/04-UI-STRUCTURE.md</code>
      </div>
    </section>
  );
}
