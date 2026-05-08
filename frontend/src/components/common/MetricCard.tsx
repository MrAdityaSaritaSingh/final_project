import type { ReactNode } from 'react';

type Variant = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'tertiary';

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  variant?: Variant;
}

const VARIANT_STYLES: Record<Variant, { border: string; iconBg: string; value: string }> = {
  purple: { border: 'border-violet-500', iconBg: 'bg-surface-container-low text-violet-500', value: 'text-on-surface' },
  blue:   { border: 'border-accent',   iconBg: 'bg-surface-container-low text-accent',    value: 'text-on-surface'  },
  green:  { border: 'border-success',  iconBg: 'bg-surface-container-low text-success',   value: 'text-on-surface'  },
  red:    { border: 'border-destructive',    iconBg: 'bg-surface-container-low text-destructive',     value: 'text-on-surface'    },
  amber:  { border: 'border-warning',  iconBg: 'bg-surface-container-low text-warning',   value: 'text-on-surface'  },
  tertiary: { border: 'border-tertiary', iconBg: 'bg-surface-container-low text-tertiary', value: 'text-on-surface' },
};

export default function MetricCard({ label, value, subtitle, icon, variant = 'blue' }: MetricCardProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <div className={`bg-surface-container-lowest border ${s.border} p-5 transition-colors duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-table-header text-on-surface-variant leading-none">{label}</p>
        {icon && (
          <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
            {icon}
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold font-table leading-tight ${s.value}`}>{value}</p>
      {subtitle && <p className="text-status-label text-on-surface-variant mt-1.5">{subtitle}</p>}
    </div>
  );
}
