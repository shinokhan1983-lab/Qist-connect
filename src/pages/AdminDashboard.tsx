import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Dealer, Category, Product, CustomerRequest, Application, Transaction, RevenueEntry, Settings, Profile, Review } from '@/lib/types';
import { formatPKR, formatDate, downloadCSV, cx } from '@/lib/utils';
import { Card, Button, Badge, StatusBadge, Spinner, EmptyState, Modal, Input, Select, Textarea, StatCard } from '@/components/ui';
import {
  LayoutDashboard, Users, Store, Package, Receipt, Wallet, Settings as SettingsIcon,
  BarChart3, Tags, Check, X, FileDown, Ban, RotateCcw, MessageSquare,
} from 'lucide-react';

type Tab = 'overview' | 'financial' | 'dealers' | 'transactions' | 'categories' | 'reports' | 'settings';

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'financial', label: 'Financial', icon: Wallet },
    { id: 'dealers', label: 'Dealers', icon: Store },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition',
              tab === t.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300'
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <BusinessOverview />}
      {tab === 'financial' && <FinancialOverview />}
      {tab === 'dealers' && <DealerManagement />}
      {tab === 'transactions' && <AllTransactions />}
      {tab === 'categories' && <CategoryManager />}
      {tab === 'reports' && <Reports />}
      {tab === 'settings' && <PlatformSettings />}
    </div>
  );
}

function useAdminData() {
  const [data, setData] = useState<{
    dealers: Dealer[]; categories: Category[]; products: Product[]; requests: CustomerRequest[];
    applications: Application[]; txns: Transaction[]; revenue: RevenueEntry[]; profiles: Profile[]; reviews: Review[];
  } | null>(null);

  const load = useCallback(async () => {
    const [d, c, p, r, a, t, rev, prof, rw] = await Promise.all([
      supabase.from('dealers').select('*, category:categories(name)'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*'),
      supabase.from('customer_requests').select('*'),
      supabase.from('applications').select('*'),
      supabase.from('transactions').select('*, dealer:dealers(business_name), product:products(name)'),
      supabase.from('revenue_entries').select('*, dealer:dealers(business_name)').order('entry_date', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('reviews').select('*'),
    ]);
    setData({
      dealers: (d.data as Dealer[]) ?? [],
      categories: (c.data as Category[]) ?? [],
      products: (p.data as Product[]) ?? [],
      requests: (r.data as CustomerRequest[]) ?? [],
      applications: (a.data as Application[]) ?? [],
      txns: (t.data as Transaction[]) ?? [],
      revenue: (rev.data as RevenueEntry[]) ?? [],
      profiles: (prof.data as Profile[]) ?? [],
      reviews: (rw.data as Review[]) ?? [],
    });
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, reload: load };
}

function BusinessOverview() {
  const { data, loading } = useAdminDataState();
  if (loading || !data) return <Spinner />;

  const customers = data.profiles.filter((p) => p.role === 'customer');
  const activeDealers = data.dealers.filter((d) => d.status === 'active');
  const completed = data.txns.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Registered customers" value={customers.length} sub={`${customers.filter((c) => data.requests.some((r) => r.customer_id === c.id)).length} active`} />
        <StatCard icon={<Store className="h-5 w-5" />} label="Dealers" value={data.dealers.length} sub={`${activeDealers.length} active · ${data.dealers.filter((d) => d.status === 'pending').length} pending`} accent="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" />
        <StatCard icon={<Package className="h-5 w-5" />} label="Products listed" value={data.products.length} accent="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Customer requests" value={data.requests.length} accent="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" />
        <StatCard icon={<Check className="h-5 w-5" />} label="Successful deals" value={completed.length} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Pending applications" value={data.applications.filter((a) => a.status === 'verification').length} accent="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" />
        <StatCard icon={<X className="h-5 w-5" />} label="Rejected applications" value={data.applications.filter((a) => a.status === 'rejected').length} accent="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Deal volume" value={formatPKR(data.txns.reduce((s, t) => s + Number(t.agreed_price), 0))} accent="bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300" />
      </div>

      <Card className="p-5">
        <h3 className="mb-3 font-bold text-gray-900 dark:text-white">Dealer performance</h3>
        {data.dealers.length === 0 ? <p className="text-sm text-gray-500">No dealers yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-gray-400 dark:border-gray-700">
                <th className="py-2 pr-3">Dealer</th><th className="px-3">Status</th><th className="px-3">Products</th><th className="px-3">Leads</th><th className="px-3">Deals</th><th className="px-3">Sales</th><th className="px-3">Rating</th>
              </tr></thead>
              <tbody>
                {data.dealers.map((d) => {
                  const deals = data.txns.filter((t) => t.dealer_id === d.id);
                  return (
                    <tr key={d.id} className="border-b last:border-0 dark:border-gray-700">
                      <td className="py-2 pr-3 font-medium dark:text-white">{d.business_name}</td>
                      <td className="px-3"><StatusBadge status={d.status} /></td>
                      <td className="px-3 dark:text-gray-300">{data.products.filter((p) => p.dealer_id === d.id).length}</td>
                      <td className="px-3 dark:text-gray-300">{data.requests.filter((r) => r.dealer_id === d.id).length}</td>
                      <td className="px-3 dark:text-gray-300">{deals.length}</td>
                      <td className="px-3 dark:text-gray-300">{formatPKR(deals.reduce((s, t) => s + Number(t.agreed_price), 0))}</td>
                      <td className="px-3 dark:text-gray-300">{d.rating_avg > 0 ? `${d.rating_avg.toFixed(1)} ★` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900 dark:text-white"><MessageSquare className="h-4 w-4" /> Latest customer reviews</h3>
        {data.reviews.length === 0 ? <p className="text-sm text-gray-500">No reviews yet.</p> : (
          <div className="space-y-2">
            {data.reviews.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">"{r.comment}"</p>
                  <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                </div>
                <span className="text-amber-400">{'★'.repeat(r.rating)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function useAdminDataState() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAll>> | null>(null);

  useEffect(() => {
    loadAll().then((d) => { setData(d); setLoading(false); });
  }, []);

  return { data, loading };
}

async function loadAll() {
  const [d, c, p, r, a, t, rev, prof, rw] = await Promise.all([
    supabase.from('dealers').select('*, category:categories(name)'),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('products').select('*'),
    supabase.from('customer_requests').select('*'),
    supabase.from('applications').select('*'),
    supabase.from('transactions').select('*, dealer:dealers(business_name), product:products(name)'),
    supabase.from('revenue_entries').select('*, dealer:dealers(business_name)').order('entry_date', { ascending: false }),
    supabase.from('profiles').select('*'),
    supabase.from('reviews').select('*'),
  ]);
  return {
    dealers: (d.data as Dealer[]) ?? [],
    categories: (c.data as Category[]) ?? [],
    products: (p.data as Product[]) ?? [],
    requests: (r.data as CustomerRequest[]) ?? [],
    applications: (a.data as Application[]) ?? [],
    txns: (t.data as Transaction[]) ?? [],
    revenue: (rev.data as RevenueEntry[]) ?? [],
    profiles: (prof.data as Profile[]) ?? [],
    reviews: (rw.data as Review[]) ?? [],
  };
}

function FinancialOverview() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ type: 'expense', amount: 0, description: '' });

  const load = useCallback(async () => {
    const { data } = await supabase.from('revenue_entries').select('*, dealer:dealers(business_name)').order('entry_date', { ascending: false });
    setEntries((data as RevenueEntry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sum = (type: string) => entries.filter((e) => e.type === type).reduce((s, e) => s + Number(e.amount), 0);
  const income = sum('commission') + sum('subscription') + sum('advertisement') + sum('featured_listing');
  const expenses = sum('expense');

  const add = async () => {
    await supabase.from('revenue_entries').insert({ type: form.type, amount: Number(form.amount), description: form.description });
    setAddOpen(false);
    setForm({ type: 'expense', amount: 0, description: '' });
    await load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Total platform revenue" value={formatPKR(income)} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Commission earned" value={formatPKR(sum('commission'))} />
        <StatCard icon={<Store className="h-5 w-5" />} label="Subscription income" value={formatPKR(sum('subscription'))} accent="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" />
        <StatCard icon={<Package className="h-5 w-5" />} label="Featured listing income" value={formatPKR(sum('featured_listing'))} accent="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" />
        <StatCard icon={<X className="h-5 w-5" />} label="Operating expenses" value={formatPKR(expenses)} accent="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Net platform profit" value={formatPKR(income - expenses)} accent="bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>Add revenue / expense entry</Button>
      </div>

      <Card className="overflow-x-auto">
        {entries.length === 0 ? <EmptyState icon={<Wallet className="h-10 w-10" />} title="No revenue entries" /> : (
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-900/50 dark:border-gray-700">
              <th className="px-4 py-3">Date</th><th className="px-4">Type</th><th className="px-4">Description</th><th className="px-4">Dealer</th><th className="px-4 text-right">Amount</th>
            </tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="px-4 py-3 dark:text-gray-300">{formatDate(e.entry_date)}</td>
                  <td className="px-4"><Badge className={e.type === 'expense' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}>{e.type.replace('_', ' ')}</Badge></td>
                  <td className="px-4 dark:text-gray-300">{e.description}</td>
                  <td className="px-4 text-gray-500">{e.dealer?.business_name ?? '—'}</td>
                  <td className={cx('px-4 text-right font-semibold', e.type === 'expense' ? 'text-rose-600' : 'text-emerald-600')}>
                    {e.type === 'expense' ? '−' : '+'}{formatPKR(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add entry">
        <div className="space-y-3">
          <Select label="Type" value={form.type} onChange={(ev) => setForm({ ...form, type: ev.target.value })}>
            <option value="expense">Operating expense</option>
            <option value="subscription">Subscription income</option>
            <option value="advertisement">Advertisement income</option>
            <option value="featured_listing">Featured listing income</option>
          </Select>
          <Input label="Amount (PKR)" type="number" value={form.amount || ''} onChange={(ev) => setForm({ ...form, amount: Number(ev.target.value) })} />
          <Textarea label="Description" rows={2} value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} />
          <div className="flex justify-end"><Button onClick={add} disabled={!form.amount}>Save entry</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function DealerManagement() {
  const { data, reload } = useAdminData();
  const [viewDealer, setViewDealer] = useState<Dealer | null>(null);

  const setStatus = async (d: Dealer, status: Dealer['status']) => {
    await supabase.from('dealers').update({ status }).eq('id', d.id);
    await supabase.from('notifications').insert({
      user_id: d.owner_id,
      title: status === 'active' ? 'Dealer account approved' : `Dealer account ${status}`,
      body: status === 'active'
        ? 'Your dealer account is now active. You can list products and receive leads.'
        : `Your dealer account status changed to ${status}. Contact support for details.`,
      type: 'dealer',
    });
    await reload();
  };

  const setRate = async (d: Dealer, value: number) => {
    await supabase.from('dealers').update({ commission_value: value }).eq('id', d.id);
    await reload();
  };

  if (!data) return <Spinner />;
  if (data.dealers.length === 0) return <EmptyState icon={<Store className="h-10 w-10" />} title="No dealer registrations yet" />;

  return (
    <div className="space-y-3">
      {data.dealers.map((d) => (
        <Card key={d.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 dark:text-white">{d.business_name}</p>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-xs text-gray-500">{d.owner_name} · {d.city} · {d.category?.name ?? '—'} · joined {formatDate(d.created_at)}</p>
              <p className="text-xs text-gray-400">{d.shop_address}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-500">
                Rate %
                <input
                  type="number"
                  defaultValue={d.commission_value}
                  onBlur={(e) => Number(e.target.value) !== d.commission_value && setRate(d, Number(e.target.value))}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={d.commission_type !== 'percentage'}
                />
              </label>
              {d.status === 'pending' && (
                <>
                  <Button size="sm" variant="success" onClick={() => setStatus(d, 'active')}><Check className="h-3.5 w-3.5" /> Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => setStatus(d, 'rejected')}><X className="h-3.5 w-3.5" /> Reject</Button>
                </>
              )}
              {d.status === 'active' && (
                <Button size="sm" variant="secondary" onClick={() => setStatus(d, 'suspended')}><Ban className="h-3.5 w-3.5" /> Suspend</Button>
              )}
              {(d.status === 'suspended' || d.status === 'rejected') && (
                <Button size="sm" variant="success" onClick={() => setStatus(d, 'active')}><RotateCcw className="h-3.5 w-3.5" /> Reactivate</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setViewDealer(d)}>Details</Button>
            </div>
          </div>
        </Card>
      ))}

      <Modal open={!!viewDealer} onClose={() => setViewDealer(null)} title={viewDealer?.business_name ?? ''}>
        {viewDealer && (
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Owner:</span> <strong className="dark:text-white">{viewDealer.owner_name}</strong></p>
            <p><span className="text-gray-500">Phone:</span> {viewDealer.phone}</p>
            <p><span className="text-gray-500">Address:</span> {viewDealer.shop_address}</p>
            <p><span className="text-gray-500">Service areas:</span> {viewDealer.service_areas || '—'}</p>
            <p><span className="text-gray-500">Commission:</span> {viewDealer.commission_type === 'percentage' ? `${viewDealer.commission_value}%` : formatPKR(viewDealer.commission_value)}</p>
            <p><span className="text-gray-500">Subscription:</span> {viewDealer.subscription_plan} {viewDealer.subscription_expires_at ? `(expires ${formatDate(viewDealer.subscription_expires_at)})` : ''}</p>
            <p><span className="text-gray-500">Rating:</span> {viewDealer.rating_avg > 0 ? `${viewDealer.rating_avg.toFixed(1)} ★ (${viewDealer.rating_count})` : 'No ratings'}</p>
            <p><span className="text-gray-500">Products:</span> {data.products.filter((p) => p.dealer_id === viewDealer.id).length}</p>
            <p><span className="text-gray-500">Transactions:</span> {data.txns.filter((t) => t.dealer_id === viewDealer.id).length}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AllTransactions() {
  const [txns, setTxns] = useState<(Transaction & { dealer?: Dealer; product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    supabase.from('transactions').select('*, dealer:dealers(business_name), product:products(name)').order('created_at', { ascending: false })
      .then(({ data }) => { setTxns((data as Transaction[]) ?? []); setLoading(false); });
  }, []);

  const setCommission = async (t: Transaction, status: 'pending' | 'received') => {
    await supabase.from('transactions').update({ commission_status: status }).eq('id', t.id);
    if (status === 'received' && !t.commission_status.startsWith('received')) {
      await supabase.from('revenue_entries').insert({
        type: 'commission',
        amount: t.commission_amount,
        description: `Commission received on ${t.transaction_ref}`,
        dealer_id: t.dealer_id,
        ref_id: t.id,
      });
    }
    const { data } = await supabase.from('transactions').select('*, dealer:dealers(business_name), product:products(name)').order('created_at', { ascending: false });
    setTxns((data as Transaction[]) ?? []);
  };

  if (loading) return <Spinner />;

  const filtered = filter === 'all' ? txns : txns.filter((t) => (filter === 'commission' ? t.commission_status === 'pending' : t.status === filter));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-52">
          <option value="all">All transactions</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="defaulted">Defaulted</option>
          <option value="cancelled">Cancelled</option>
          <option value="commission">Commission pending</option>
        </Select>
        <Button variant="secondary" onClick={() => downloadCSV('platform-transactions.csv', filtered.map((t) => ({
          ref: t.transaction_ref, dealer: t.dealer?.business_name, product: t.product?.name, value: t.agreed_price,
          advance: t.advance_amount, monthly: t.monthly_installment, duration: t.duration_months,
          commission: t.commission_amount, commission_status: t.commission_status, status: t.status, created: t.created_at.slice(0, 10),
        })))}>
          <FileDown className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      {filtered.length === 0 ? <EmptyState icon={<Receipt className="h-10 w-10" />} title="No transactions" /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead><tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-900/50 dark:border-gray-700">
              <th className="px-4 py-3">Ref</th><th className="px-4">Dealer</th><th className="px-4">Product</th><th className="px-4">Value</th><th className="px-4">Commission</th><th className="px-4">Status</th><th className="px-4">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium dark:text-white">{t.transaction_ref}</td>
                  <td className="px-4 text-gray-500">{t.dealer?.business_name}</td>
                  <td className="px-4 dark:text-gray-300">{t.product?.name}</td>
                  <td className="px-4 dark:text-gray-300">{formatPKR(t.agreed_price)}</td>
                  <td className="px-4">
                    <span className="dark:text-gray-300">{formatPKR(t.commission_amount)}</span>{' '}
                    <Badge className={t.commission_status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{t.commission_status}</Badge>
                  </td>
                  <td className="px-4"><StatusBadge status={t.status} /></td>
                  <td className="px-4">
                    {t.commission_status === 'pending' ? (
                      <Button size="sm" variant="success" onClick={() => setCommission(t, 'received')}>Mark received</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setCommission(t, 'pending')}>Undo</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function CategoryManager() {
  const { data, reload } = useAdminData();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);

  if (!data) return <Spinner />;

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const values = {
      name: editing.name,
      slug: (editing.slug || editing.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')) ?? '',
      icon: editing.icon || 'Package',
      description: editing.description ?? '',
      commission_type: editing.commission_type ?? 'percentage',
      commission_value: Number(editing.commission_value ?? 2),
      sort_order: Number(editing.sort_order ?? 99),
      is_active: editing.is_active ?? true,
    };
    if (editing.id) await supabase.from('categories').update(values).eq('id', editing.id);
    else await supabase.from('categories').insert(values);
    setSaving(false);
    setEditing(null);
    await reload();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ commission_type: 'percentage', commission_value: 2, icon: 'Package', is_active: true })}>Add category</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-900/50 dark:border-gray-700">
            <th className="px-4 py-3">Category</th><th className="px-4">Commission</th><th className="px-4">Products</th><th className="px-4">Status</th><th className="px-4">Actions</th>
          </tr></thead>
          <tbody>
            {data.categories.map((c) => (
              <tr key={c.id} className="border-b last:border-0 dark:border-gray-700">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.slug}</p>
                </td>
                <td className="px-4 dark:text-gray-300">{c.commission_type === 'percentage' ? `${c.commission_value}%` : formatPKR(c.commission_value)}</td>
                <td className="px-4 dark:text-gray-300">{data.products.filter((p) => p.category_id === c.id).length}</td>
                <td className="px-4"><StatusBadge status={c.is_active ? 'active' : 'expired'} /></td>
                <td className="px-4">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit category' : 'Add category'}>
        {editing && (
          <div className="space-y-3">
            <Input label="Name" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input label="Description" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Commission type" value={editing.commission_type} onChange={(e) => setEditing({ ...editing, commission_type: e.target.value as 'percentage' | 'fixed' })}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </Select>
              <Input label="Commission value" type="number" value={editing.commission_value ?? ''} onChange={(e) => setEditing({ ...editing, commission_value: Number(e.target.value) })} />
            </div>
            <Input label="Sort order" type="number" value={editing.sort_order ?? ''} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !editing.name}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Reports() {
  const { data } = useAdminData();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');

  const cutoff = useMemo(() => {
    const d = new Date();
    if (period === 'daily') d.setDate(d.getDate() - 1);
    else if (period === 'weekly') d.setDate(d.getDate() - 7);
    else if (period === 'monthly') d.setMonth(d.getMonth() - 1);
    else if (period === 'quarterly') d.setMonth(d.getMonth() - 3);
    else d.setFullYear(d.getFullYear() - 1);
    return d;
  }, [period]);

  if (!data) return <Spinner />;

  const recent = (iso: string | null | undefined) => iso ? new Date(iso) >= cutoff : false;
  const rTxns = data.txns.filter((t) => recent(t.created_at));
  const rRequests = data.requests.filter((r) => recent(r.created_at));
  const conversion = rRequests.length ? Math.round((rTxns.length / rRequests.length) * 100) : 0;

  const byCategory = data.categories.map((c) => ({
    name: c.name,
    deals: rTxns.filter((t) => data.products.find((p) => p.id === t.product_id)?.category_id === c.id).length,
    volume: rTxns.filter((t) => data.products.find((p) => p.id === t.product_id)?.category_id === c.id).reduce((s, t) => s + Number(t.agreed_price), 0),
  })).filter((x) => x.deals > 0);

  const maxVol = Math.max(1, ...byCategory.map((b) => b.volume));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="sm:w-48">
          <option value="daily">Last 24 hours</option>
          <option value="weekly">Last 7 days</option>
          <option value="monthly">Last 30 days</option>
          <option value="quarterly">Last quarter</option>
          <option value="yearly">Last year</option>
        </Select>
        <Button variant="secondary" onClick={() => downloadCSV(`qist-report-${period}.csv`, rTxns.map((t) => ({
          ref: t.transaction_ref, dealer: t.dealer?.business_name, value: t.agreed_price, commission: t.commission_amount, status: t.status, date: t.created_at.slice(0, 10),
        })))}>
          <FileDown className="h-4 w-4" /> Download report (CSV)
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Requests" value={rRequests.length} />
        <StatCard icon={<Check className="h-5 w-5" />} label="Transactions" value={rTxns.length} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Commission" value={formatPKR(rTxns.reduce((s, t) => s + Number(t.commission_amount), 0))} accent="bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300" />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Conversion rate" value={`${conversion}%`} accent="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" />
      </div>

      <Card className="p-5">
        <h3 className="mb-4 font-bold text-gray-900 dark:text-white">Category-wise sales volume</h3>
        {byCategory.length === 0 ? <p className="text-sm text-gray-500">No sales in this period.</p> : (
          <div className="space-y-3">
            {byCategory.map((b) => (
              <div key={b.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium dark:text-gray-300">{b.name}</span>
                  <span className="text-gray-500">{b.deals} deals · {formatPKR(b.volume)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="h-2.5 rounded-full bg-teal-500 transition-all" style={{ width: `${(b.volume / maxVol) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-bold text-gray-900 dark:text-white">Dealer response & conversion</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-gray-400 dark:border-gray-700">
              <th className="py-2 pr-3">Dealer</th><th className="px-3">Leads</th><th className="px-3">Deals</th><th className="px-3">Conversion</th><th className="px-3">Avg response</th>
            </tr></thead>
            <tbody>
              {data.dealers.map((d) => {
                const leads = rRequests.filter((r) => r.dealer_id === d.id).length;
                const deals = rTxns.filter((t) => t.dealer_id === d.id).length;
                return (
                  <tr key={d.id} className="border-b last:border-0 dark:border-gray-700">
                    <td className="py-2 pr-3 font-medium dark:text-white">{d.business_name}</td>
                    <td className="px-3 dark:text-gray-300">{leads}</td>
                    <td className="px-3 dark:text-gray-300">{deals}</td>
                    <td className="px-3 dark:text-gray-300">{leads ? Math.round((deals / leads) * 100) : 0}%</td>
                    <td className="px-3 dark:text-gray-300">{d.response_time_minutes ? `~${d.response_time_minutes} min` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PlatformSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setSettings(data as Settings));
  }, []);

  const save = async () => {
    if (!settings) return;
    const { id, ...values } = settings;
    await supabase.from('settings').update(values).eq('id', 1);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return <Spinner />;

  return (
    <Card className="mx-auto max-w-2xl p-5">
      <h3 className="mb-4 font-bold text-gray-900 dark:text-white">Platform settings</h3>
      <div className="space-y-3">
        <Input label="Platform name" value={settings.platform_name} onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })} />
        <Input label="Tagline" value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} />
        <Input label="Support phone" value={settings.support_phone} onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Default commission type" value={settings.commission_type} onChange={(e) => setSettings({ ...settings, commission_type: e.target.value as 'percentage' | 'fixed' })}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </Select>
          <Input label="Commission value" type="number" value={settings.commission_value} onChange={(e) => setSettings({ ...settings, commission_value: Number(e.target.value) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Monthly subscription fee (PKR)" type="number" value={settings.monthly_subscription_fee} onChange={(e) => setSettings({ ...settings, monthly_subscription_fee: Number(e.target.value) })} />
          <Input label="Annual subscription fee (PKR)" type="number" value={settings.annual_subscription_fee} onChange={(e) => setSettings({ ...settings, annual_subscription_fee: Number(e.target.value) })} />
        </div>
        <Input
          label="Cities (comma separated)"
          value={settings.cities.join(', ')}
          onChange={(e) => setSettings({ ...settings, cities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
        <Textarea label="Terms & conditions" rows={3} value={settings.terms_content} onChange={(e) => setSettings({ ...settings, terms_content: e.target.value })} />
        <Textarea label="Privacy policy" rows={3} value={settings.privacy_content} onChange={(e) => setSettings({ ...settings, privacy_content: e.target.value })} />
        <div className="flex justify-end">
          <Button onClick={save}>{saved ? 'Saved ✓' : 'Save settings'}</Button>
        </div>
      </div>
    </Card>
  );
}
