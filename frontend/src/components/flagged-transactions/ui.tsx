import React from 'react';

export function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 border-b-2 transition-colors ${
        active ? 'text-blue-600 border-blue-600' : 'text-slate-600 border-transparent hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h5 className="text-base font-semibold text-slate-800 mb-2">{title}</h5>
      {children}
    </div>
  );
}

export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function KpiCard({
  title,
  value,
  subValue,
  color,
}: {
  title: string;
  value: string;
  subValue?: string;
  color?: 'red' | 'amber' | 'green';
}) {
  const accentClass =
    color === 'red' ? 'border-l-4 border-l-red-500' : color === 'amber' ? 'border-l-4 border-l-amber-500' : color === 'green' ? 'border-l-4 border-l-emerald-500' : '';

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-6 ${accentClass}`}>
      <p className="text-xl text-slate-500 mb-2">{title}</p>
      <p className="text-5xl font-semibold text-slate-900 leading-none">{value}</p>
      {subValue ? <p className="text-2xl text-slate-600 mt-2">{subValue}</p> : null}
    </div>
  );
}
