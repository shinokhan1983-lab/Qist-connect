export function formatPKR(amount: number | null | undefined): string {
  if (amount == null || isNaN(Number(amount))) return 'PKR 0';
  return 'PKR ' + Number(amount).toLocaleString('en-PK', { maximumFractionDigits: 0 });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function isValidPKPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+92|0)?3\d{9}$/.test(cleaned) || /^(\+92|0)?3\d{2}\s?\d{7}$/.test(cleaned);
}

export function normalizePKPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+92')) return cleaned;
  if (cleaned.startsWith('0')) return '+92' + cleaned.slice(1);
  if (cleaned.startsWith('92')) return '+' + cleaned;
  return phone;
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const DURATIONS = [3, 6, 9, 12, 15, 18, 22, 24];

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  delivered: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  active: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  verification: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
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
};

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
