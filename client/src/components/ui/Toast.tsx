import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { useToastStore } from './toastStore';

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-teal-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-royal-500" />,
};

const styles = {
  success: 'border-teal-200',
  error: 'border-red-200',
  info: 'border-royal-200',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg animate-fade-in-up ${styles[t.type]}`}
        >
          <span className="mt-0.5">{icons[t.type]}</span>
          <p className="flex-1 text-sm text-navy-900">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
