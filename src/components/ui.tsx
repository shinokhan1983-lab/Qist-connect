import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800', className)}>
      {children}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, accent }: { icon: ReactNode; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className={cx('rounded-lg p-2.5 flex items-center justify-center', accent ?? 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300')}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{sub}</p>}
      </div>
    </Card>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize', className ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    delivered: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    active: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    verification: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300',
    withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300',
    suspended: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    due: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    shipped: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    defaulted: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  };
  return <Badge className={colors[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}>{status.replace('_', ' ')}</Badge>;
}

export function Button({ children, variant = 'primary', size = 'md', className, ...props }: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 focus-visible:outline-teal-600 disabled:bg-teal-600/50',
    secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/50',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50',
    ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
  };
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed', variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, className, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <input
        className={cx('w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white', className)}
        {...props}
      />
    </label>
  );
}

export function Select({ label, className, children, ...props }: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <select
        className={cx('w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white', className)}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className, ...props }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <textarea
        className={cx('w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white', className)}
        {...props}
      />
    </label>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-gray-600">
      <div className="mb-3 text-gray-300 dark:text-gray-600">{icon}</div>
      <p className="font-medium text-gray-600 dark:text-gray-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-400">{hint}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
