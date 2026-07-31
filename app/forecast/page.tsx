import { ForecastClient } from '../../components/ForecastClient';

export default function ForecastPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-unsw-navy">
          Forecast / Incrementality
        </h1>
        <p className="mt-1 text-unsw-slate">
          Projected uplift for a segment + campaign. Cluster/propensity-based mock — honest about
          being a mock; not fit to real UNSW data.
        </p>
      </header>
      <ForecastClient />
    </section>
  );
}
