import { EmptyState } from '../../components/EmptyState';

export default function ForecastPage() {
  return (
    <EmptyState
      title="Forecast / Incrementality"
      description="Projected uplift for a given segment + campaign. Cluster/propensity-based mock, honest about assumptions."
    />
  );
}
