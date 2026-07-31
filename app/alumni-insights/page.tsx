import { getDataBundle } from '../../lib/data';
import { buildAlumniInsightsPage } from '../../lib/tab-data/alumni-insights';
import { AlumniInsightsClient } from '../../components/AlumniInsightsClient';

export default async function AlumniInsightsPage() {
  const bundle = await getDataBundle();
  const page = buildAlumniInsightsPage(bundle, { limit: 60 });

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-unsw-navy">Alumni Insights</h1>
        <p className="mt-1 text-unsw-slate">
          LinkedIn-style career trajectory + signals per alumni. Cards are ranked by recent signal
          confidence — the top of the grid is where the agent would surface targets first.
        </p>
      </header>
      <AlumniInsightsClient page={page} />
    </section>
  );
}
