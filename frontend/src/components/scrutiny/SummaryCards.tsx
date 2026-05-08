import MetricCard from '../common/MetricCard';
import type { ScrutinySummary } from '../../types/scrutiny';
import { formatNumber } from '../../utils/format';

interface SummaryCardsProps {
  summary: ScrutinySummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard label="Total Entries" value={formatNumber(summary.total_entries)} />
      <MetricCard label="Rule Flagged" value={formatNumber(summary.rule_flagged)} />
      <MetricCard label="ML Flagged" value={formatNumber(summary.ml_flagged)} />
      <MetricCard
        label="Total Flagged"
        value={formatNumber(summary.total_flagged)}
        subtitle={`${summary.pct_flagged}%`}
      />
    </div>
  );
}
