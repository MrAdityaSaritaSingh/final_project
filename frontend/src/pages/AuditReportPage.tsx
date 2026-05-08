import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts';
import type { ScrutinyResponse, FlaggedRow } from '../types/scrutiny';
import { formatNumber, formatCurrency } from '../utils/format';

/* ── Display helpers ── */
const CATEGORY_LABELS: Record<string, string> = {
  'ML Anomaly': 'AI Detection',
  'Round Numbers': 'Round Amounts',
  'Weekend Entries': 'Weekend Posting',
  'Weak Narration': 'Insufficient Description',
  'Period End': 'Period-End Concentration',
  'Duplicate Check': 'Duplicate Entry',
  'Manual Journal': 'Manual Entry',
};

function toDisplay(raw: string) {
  return CATEGORY_LABELS[raw] ?? raw;
}

function computeMonthlyTrend(rows: FlaggedRow[]) {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    const ym = r.date.slice(0, 7);
    counts[ym] = (counts[ym] || 0) + 1;
  });
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, flags]) => {
      const [yr, mo] = ym.split('-');
      return { month: `${MONTHS[parseInt(mo) - 1]} '${yr.slice(2)}`, flags };
    });
}

function getTopAccounts(rows: FlaggedRow[], n = 5) {
  const counts: Record<string, number> = {};
  rows.forEach((r) => { counts[r.ledger_name] = (counts[r.ledger_name] || 0) + 1; });
  return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

/** Generate business-friendly AI insights from the data */
function generateInsights(results: ScrutinyResponse): string[] {
  const { summary, category_counts, flagged_rows } = results;
  const insights: string[] = [];
  const cats = Object.fromEntries(category_counts.map((c: { category: string; count: number }) => [c.category, c.count]));

  if (summary.pct_flagged > 15)
    insights.push(`High anomaly rate detected — ${summary.pct_flagged}% of transactions are suspicious. Immediate auditor review is recommended.`);
  else if (summary.pct_flagged > 5)
    insights.push(`Moderate anomaly rate of ${summary.pct_flagged}% detected. Selected transactions require auditor scrutiny.`);
  else
    insights.push(`Low anomaly rate of ${summary.pct_flagged}% — the ledger appears largely compliant with audit rules.`);

  if (cats['Period End'] > 0)
    insights.push(`${cats['Period End'].toLocaleString()} transaction${cats['Period End'] > 1 ? 's' : ''} detected near period-end dates. This pattern may indicate revenue management or cut-off manipulation.`);

  if (cats['Duplicate Check'] > 0)
    insights.push(`${cats['Duplicate Check'].toLocaleString()} potential duplicate transaction${cats['Duplicate Check'] > 1 ? 's' : ''} identified. These should be verified to prevent duplicate payments.`);

  if (cats['Round Numbers'] > 0)
    insights.push(`${cats['Round Numbers'].toLocaleString()} round-amount entries found. Large round-number transactions often indicate estimated or manually entered figures.`);

  if (cats['ML Anomaly'] > 0)
    insights.push(`AI anomaly detection flagged ${cats['ML Anomaly'].toLocaleString()} transaction${cats['ML Anomaly'] > 1 ? 's' : ''} with unusual patterns not captured by standard rules.`);

  if (cats['Weekend Entries'] > 0)
    insights.push(`${cats['Weekend Entries'].toLocaleString()} transactions were posted on weekends or holidays, which may indicate unauthorized or urgent out-of-cycle entries.`);

  if (cats['Weak Narration'] > 0)
    insights.push(`${cats['Weak Narration'].toLocaleString()} entries have insufficient narration. Complete descriptions are essential for audit trail compliance.`);

  /* Total amount insight */
  const totalAmt = flagged_rows.reduce((s: number, r: FlaggedRow) => s + Math.abs(r.amount), 0);
  if (totalAmt > 0)
    insights.push(`Total value of suspicious transactions: ${formatCurrency(totalAmt)}. High-value flagged entries should receive priority review.`);

  return insights;
}

/* ── Props ── */
interface Props {
  results: ScrutinyResponse | null;
  exporting: boolean;
  onUploadClick: () => void;
  onExport: () => void;
}

/* ── Empty state ── */
function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-800 mb-2">No Report Available</h2>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">Complete an audit analysis to generate the insights report.</p>
      <button
        onClick={onUploadClick}
        className="px-5 py-2.5 bg-[#0F766E] text-white rounded-xl text-sm font-semibold hover:bg-[#115E59] transition-colors"
      >
        Start Analysis
      </button>
    </div>
  );
}

/* ── Main component ── */
export default function AuditReportPage({ results, exporting, onUploadClick, onExport }: Props) {
  if (!results) return <EmptyState onUploadClick={onUploadClick} />;

  const { summary, category_counts, flagged_rows } = results;
  const trendData = computeMonthlyTrend(flagged_rows);
  const topAccounts = getTopAccounts(flagged_rows);
  const topCategory = [...category_counts].sort((a, b) => b.count - a.count)[0];
  const peakMonth = trendData.reduce((mx, d) => d.flags > mx.flags ? d : mx, { month: '—', flags: 0 });
  const totalAmt = flagged_rows.reduce((s: number, r: FlaggedRow) => s + Math.abs(r.amount), 0);
  const insights = generateInsights(results);
  const riskPct = summary.pct_flagged;
  const riskLevel = riskPct < 5 ? 'LOW' : riskPct < 15 ? 'MEDIUM' : 'HIGH';
  const riskBadgeCls = riskPct < 5 ? 'bg-green-100 text-green-800' : riskPct < 15 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Report header ── */}
      <div className="bg-[#134E4A] rounded-xl p-7 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between mb-5 gap-4">
            <div>
              <p className="text-teal-300/60 text-[10px] font-bold uppercase tracking-[0.15em] mb-2">
                Ledger Scrutiny Assistant · Audit Report
              </p>
              <h1 className="text-2xl font-bold leading-tight">General Ledger Audit Report</h1>
              <p className="text-teal-200/60 text-xs mt-2">
                AI-Powered Anomaly Detection · Rule-Based Audit Checks
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ${riskBadgeCls}`}>
              RISK: {riskLevel}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/15 pt-4">
            {[
              { label: 'Report Date', value: today },
              { label: 'Entries Analyzed', value: formatNumber(summary.total_entries) },
              { label: 'Flagged Rate', value: `${riskPct}%` },
              { label: 'Engine', value: 'Scrutiny v2.0' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-teal-300/50 text-[10px] font-medium uppercase tracking-wide">{label}</p>
                <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Summary metrics ── */}
      <ReportSection accent="bg-[#0F766E]" title="Executive Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Total Entries', value: formatNumber(summary.total_entries), sub: 'Reviewed' },
            { label: 'Rule-Based Flags', value: formatNumber(summary.rule_flagged), sub: `${((summary.rule_flagged / summary.total_entries) * 100).toFixed(1)}% of total` },
            { label: 'AI Detections', value: formatNumber(summary.ml_flagged), sub: 'By anomaly model' },
            { label: 'Total Suspicious', value: formatNumber(summary.total_flagged), sub: `${riskPct}% flagged` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-lg font-bold text-[#134E4A]">{value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* ── Key Findings ── */}
      <ReportSection accent="bg-amber-400" title="Key Findings">
        <ul className="mt-4 space-y-2.5">
          {[
            topCategory && `Most frequent anomaly: "${toDisplay(topCategory.category)}" — ${topCategory.count.toLocaleString()} transactions`,
            peakMonth.flags > 0 && `Peak activity: ${peakMonth.month} with ${peakMonth.flags.toLocaleString()} suspicious entries`,
            `Total suspicious value: ${formatCurrency(totalAmt)}`,
            summary.ml_flagged > 0 && `AI detection identified ${formatNumber(summary.ml_flagged)} unique anomalies beyond rule checks`,
            `Overall risk level: ${riskLevel}`,
          ]
            .filter(Boolean)
            .map((finding, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                {finding}
              </li>
            ))}
        </ul>
      </ReportSection>

      {/* ── AI Insights ── */}
      <ReportSection accent="bg-[#0F766E]" title="AI-Generated Audit Insights">
        <div className="mt-4 space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 bg-teal-50/60 border border-teal-100 rounded-xl p-3.5">
              <div className="w-5 h-5 rounded-lg bg-[#0F766E] flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* ── Anomaly trend ── */}
      {trendData.length > 1 && (
        <ReportSection accent="bg-emerald-500" title="Anomaly Trend">
          <p className="text-xs text-slate-400 mt-1 mb-4">Monthly count of suspicious transactions</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 15, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <ReTooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
              <Line
                type="monotone"
                dataKey="flags"
                name="Suspicious"
                stroke="#0F766E"
                strokeWidth={2.5}
                dot={{ fill: '#0F766E', r: 3.5, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#14B8A6', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ReportSection>
      )}

      {/* ── Findings by type ── */}
      <ReportSection accent="bg-red-500" title="Findings by Anomaly Type">
        <div className="mt-4 space-y-2.5">
          {[...category_counts]
            .sort((a, b) => b.count - a.count)
            .map(({ category, count }) => {
              const pct = Math.round((count / summary.total_flagged) * 100);
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-32 text-xs font-semibold text-slate-600 truncate flex-shrink-0">
                    {toDisplay(category)}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0F766E]"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-10 text-right">{count.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
        </div>
      </ReportSection>

      {/* ── Top suspicious accounts ── */}
      {topAccounts.length > 0 && (
        <ReportSection accent="bg-purple-500" title="Top Suspicious Accounts">
          <div className="mt-4 space-y-2">
            {topAccounts.map(({ name, count }, i) => (
              <div key={name} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="w-6 h-6 rounded-lg bg-[#134E4A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{name}</span>
                <span className="text-xs font-bold text-red-600 flex-shrink-0">{count} flag{count > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* ── Conclusion ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <ReportSection accent="bg-slate-400" title="Audit Conclusion">
          <p className="text-sm text-slate-600 leading-relaxed mt-4">
            This Computer-Assisted Audit Technique (CAAT) analysis reviewed{' '}
            <strong className="text-slate-800">{formatNumber(summary.total_entries)} journal entries</strong>{' '}
            and identified{' '}
            <strong className="text-slate-800">{formatNumber(summary.total_flagged)} suspicious transactions</strong>{' '}
            ({riskPct}%) that warrant auditor review. The overall risk assessment is{' '}
            <strong className="text-slate-800">{riskLevel}</strong>.
            {topCategory && (
              <> The most common anomaly type was{' '}
                <strong className="text-slate-800">{toDisplay(topCategory.category)}</strong>{' '}
                ({topCategory.count.toLocaleString()} occurrences).
              </>
            )}
          </p>
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-[11px] font-bold text-amber-700 mb-1">Important Disclaimer</p>
            <p className="text-[11px] text-amber-600 leading-relaxed">
              This report is generated by an automated audit intelligence system. Inclusion of a
              transaction does not constitute evidence of error or fraud — it indicates the
              transaction requires independent professional review. All findings must be verified
              by a qualified auditor before any conclusions are drawn.
            </p>
          </div>
        </ReportSection>
      </div>

      {/* ── Download CTA ── */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-sm font-bold text-slate-800">Export Full Audit Report</p>
          <p className="text-xs text-slate-400 mt-0.5">Download all suspicious transactions as Excel (.xlsx)</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            {exporting ? 'Generating...' : 'Download Excel Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ReportSection sub-component ── */
function ReportSection({
  accent,
  title,
  children,
}: {
  accent: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5">
        <span className={`w-1 h-5 rounded-full ${accent} flex-shrink-0`} />
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}
