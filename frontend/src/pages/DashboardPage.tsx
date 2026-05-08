import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import type { ScrutinyResponse, FlaggedRow } from '../types/scrutiny';
import MetricCard from '../components/common/MetricCard';
import { formatNumber, formatCurrency } from '../utils/format';

interface DashboardPageProps {
  results: ScrutinyResponse | null;
  loading: boolean;
  onUploadClick: () => void;
  onResultsClick: () => void;
}

/* ── Helpers ── */
const CATEGORY_LABELS: Record<string, string> = {
  'ML Anomaly': 'AI Detection',
  'Round Numbers': 'Round Amounts',
  'Weekend Entries': 'Weekend Posting',
  'Weak Narration': 'Insufficient Description',
  'Period End': 'Period-End Concentration',
  'Duplicate Check': 'Duplicate Entry',
  'Manual Journal': 'Manual Entry',
};

function toDisplayCategory(raw: string) {
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
    .map(([ym, count]) => {
      const [yr, mo] = ym.split('-');
      return { month: `${MONTHS[parseInt(mo) - 1]} '${yr.slice(2)}`, anomalies: count };
    });
}

const PIE_COLORS = ['#EF4444', '#10B981'];

/* ── Empty state ── */
function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[62vh] text-center">
      <div className="w-16 h-16 bg-[#0F766E]/8 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-[#0F766E]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">No Audit Data</h2>
      <p className="text-slate-400 text-sm max-w-xs mb-8 leading-relaxed">
        Upload a General Ledger file to run the AI-powered audit analysis and see results here.
      </p>
      <button
        onClick={onUploadClick}
        className="px-6 py-3 bg-[#0F766E] text-white rounded-xl font-semibold text-sm hover:bg-[#115E59] transition-colors shadow-lg shadow-teal-900/15"
      >
        Start New Audit
      </button>

      {/* Feature list */}
      <div className="grid grid-cols-3 gap-4 mt-12 max-w-lg w-full text-left">
        {[
          { icon: '🔍', title: 'Rule-Based Checks', desc: '6 audit rules including round amounts, duplicates & period-end entries' },
          { icon: '🤖', title: 'AI Detection', desc: 'Machine learning identifies complex anomalies invisible to manual review' },
          { icon: '📊', title: 'Risk Scoring', desc: 'Each transaction receives a risk score for prioritized auditor review' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <span className="text-xl">{icon}</span>
            <p className="text-xs font-bold text-slate-700 mt-2 mb-1">{title}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function DashboardPage({
  results,
  loading,
  onUploadClick,
  onResultsClick,
}: DashboardPageProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!results) return <EmptyState onUploadClick={onUploadClick} />;

  const { summary, category_counts, flagged_rows } = results;
  const trendData = computeMonthlyTrend(flagged_rows);
  const riskPct = summary.pct_flagged;
  const riskVariant = riskPct < 5 ? 'green' : riskPct < 15 ? 'amber' : 'red';
  const riskLabel = riskPct < 5 ? 'Low Risk' : riskPct < 15 ? 'Medium Risk' : 'High Risk';
  const recentRows = [...flagged_rows].slice(-5).reverse();

  const pieData = [
    { name: 'Suspicious', value: summary.total_flagged },
    { name: 'Clean', value: summary.total_entries - summary.total_flagged },
  ];

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          label="Total Transactions"
          value={formatNumber(summary.total_entries)}
          subtitle="Entries analyzed"
          variant="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          }
        />
        <MetricCard
          label="Suspicious Transactions"
          value={formatNumber(summary.total_flagged)}
          subtitle={`${riskPct}% of total`}
          variant="red"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
        <MetricCard
          label="AI Detections"
          value={formatNumber(summary.ml_flagged)}
          subtitle="By AI anomaly detection"
          variant="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          }
        />
        <MetricCard
          label="Risk Level"
          value={riskLabel}
          subtitle={`${riskPct}% flagged rate`}
          variant={riskVariant}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          }
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend chart — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-800">Anomaly Trend</h3>
            <span className="text-xs text-slate-400">Suspicious transactions over time</span>
          </div>
          {trendData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <ReTooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="anomalies"
                  name="Suspicious"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  dot={{ fill: '#0F766E', r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#14B8A6', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-slate-400">
              Not enough data for trend
            </div>
          )}
        </div>

        {/* Pie chart — 1 col */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Anomaly Distribution</h3>
          <p className="text-xs text-slate-400 mb-2">Clean vs suspicious entries</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <ReTooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-1">
            <p className="text-2xl font-bold text-red-600">{riskPct}%</p>
            <p className="text-[11px] text-slate-400">flagged rate</p>
          </div>
        </div>
      </div>

      {/* ── Anomaly breakdown + Recent activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Anomaly Breakdown</h3>
          <div className="space-y-3">
            {[...category_counts]
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map(({ category, count }) => {
                const pct = Math.round((count / summary.total_flagged) * 100);
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="w-28 text-xs font-medium text-slate-600 truncate flex-shrink-0">
                      {toDisplayCategory(category)}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0F766E]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-8 text-right flex-shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent suspicious activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Recent Suspicious Activity</h3>
            <button
              onClick={onResultsClick}
              className="text-xs text-[#0F766E] hover:text-[#115E59] font-semibold transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="space-y-2.5">
            {recentRows.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No suspicious activity found</p>
            ) : (
              recentRows.map((row, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{row.ledger_name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {row.date.slice(0, 10)} · {formatCurrency(row.amount)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                    {toDisplayCategory(row.scrutiny_category.split(',')[0].trim())}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── CTA banner ── */}
      <div className="flex items-center justify-between bg-[#134E4A] rounded-xl p-5 text-white">
        <div>
          <h3 className="font-bold text-base">
            {formatNumber(summary.total_flagged)} transactions need your attention
          </h3>
          <p className="text-teal-200/70 text-xs mt-0.5">
            Review and confirm suspicious entries to complete your audit
          </p>
        </div>
        <div className="flex gap-2.5 flex-shrink-0">
          <button
            onClick={onUploadClick}
            className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors border border-white/15"
          >
            Re-analyze
          </button>
          <button
            onClick={onResultsClick}
            className="px-4 py-2 text-xs font-semibold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-lg transition-colors shadow-md shadow-teal-500/20 flex items-center gap-1.5"
          >
            Review Results
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
