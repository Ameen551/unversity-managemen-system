import type { ReactNode } from 'react';
import { Card } from './Card';

export function StatCard({ label, value, icon, accent = 'royal' }: { label: string; value: ReactNode; icon: ReactNode; accent?: 'royal' | 'teal' | 'navy' | 'amber' }) {
  const accents = {
    royal: 'bg-royal-50 text-royal-600',
    teal: 'bg-teal-50 text-teal-600',
    navy: 'bg-navy-50 text-navy-700',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accents[accent]}`}>{icon}</div>
      </div>
    </Card>
  );
}
