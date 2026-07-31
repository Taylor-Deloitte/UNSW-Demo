import { getDataBundle } from '../../lib/data';
import { LifecycleHealthClient } from '../../components/LifecycleHealthClient';

export default async function LifecycleHealthPage() {
  const bundle = await getDataBundle();

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-unsw-navy">Lifecycle Health</h1>
        <p className="mt-1 text-unsw-slate">
          Cohort-level engagement, drop-off, and moments-of-relevance. The always-on agent&apos;s
          report card.
        </p>
      </header>
      <LifecycleHealthClient cohorts={bundle.cohorts} />
    </section>
  );
}
