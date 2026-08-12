import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type BadgeTone = 'royal' | 'teal' | 'green' | 'amber' | 'red' | 'slate' | 'navy';

const tones: Record<BadgeTone, string> = {
  royal: 'bg-royal-50 text-royal-700 ring-royal-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  navy: 'bg-navy-50 text-navy-700 ring-navy-200',
};

export function Badge({ tone = 'slate', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'PRESENT':
      return 'green';
    case 'ABSENT':
      return 'red';
    case 'LEAVE':
      return 'amber';
    case 'COMPLETED':
      return 'green';
    case 'PARTIAL':
      return 'amber';
    case 'FAILED':
      return 'red';
    default:
      return 'slate';
  }
}
