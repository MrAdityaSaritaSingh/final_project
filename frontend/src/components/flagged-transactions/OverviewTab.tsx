import React from 'react';
import type { ScrutinyResponse } from '@/types/scrutiny';
import { formatNumber } from '@/utils/format';
import { rupeesToCr, computeRiskBuckets, buildControls } from './utils';
import { KpiCard } from './ui';

interface Props {
  results: ScrutinyResponse;
  onReviewSource: () => void;
  onReplaceDataset: () => void;
}

export function OverviewTab({ results, onReviewSource, onReplaceDataset }: Props) {
  const flaggedRows = results.flagged_rows;
  const totalExposure = flaggedRows.reduce((acc: number, row) => acc + Math.abs(Number(row.amount) || 0), 0);
  const risk = computeRiskBuckets(flaggedRows);
  const controls = buildControls(flaggedRows);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold text-slate-900">Risk Overview</h2>
          <p className="text-2xl text-slate-600 mt-1">Comprehensive risk analysis of uploaded ledger</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReviewSource}
            className="px-4 py-2 border border-slate-300 rounded-xl text-lg font-medium text-slate-700 bg-white"
          >
            Review Source Data
          </button>
          <button
            onClick={onReplaceDataset}
            className="px-4 py-2 border border-slate-300 rounded-xl text-lg font-medium text-slate-700 bg-white"
          >
            Replace Dataset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard title="Total Transactions" value={formatNumber(results.summary.total_entries)} />
        <KpiCard title="Total Exposure" value={rupeesToCr(totalExposure)} />
        <KpiCard title="High Risk" value={formatNumber(risk.high.count)} subValue={rupeesToCr(risk.high.exposure)} color="red" />
        <KpiCard title="Medium Risk" value={formatNumber(risk.medium.count)} subValue={rupeesToCr(risk.medium.exposure)} color="amber" />
        <KpiCard title="Low Risk" value={formatNumber(risk.low.count)} subValue={rupeesToCr(risk.low.exposure)} color="green" />
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-semibold text-slate-900">Control Point Library</h3>
            <p className="text-xl text-slate-600 mt-1">Risk detection controls applied to this ledger</p>
          </div>
          <button className="px-4 py-2 border border-slate-300 rounded-xl text-lg font-medium text-slate-700 bg-white">
            Modify Controls
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-lg font-semibold text-slate-700">Control Name</th>
                <th className="px-6 py-4 text-lg font-semibold text-slate-700">Triggered Transactions</th>
                <th className="px-6 py-4 text-lg font-semibold text-slate-700">Exposure</th>
                <th className="px-6 py-4 text-lg font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((row) => (
                <tr key={row.controlName} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-6 py-4 text-2xl text-slate-800">{row.controlName}</td>
                  <td className="px-6 py-4 text-2xl text-slate-700">{formatNumber(row.triggeredTransactions)}</td>
                  <td className="px-6 py-4 text-2xl text-slate-700">{rupeesToCr(row.exposure)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-lg px-3 py-1 rounded-full ${
                        row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
