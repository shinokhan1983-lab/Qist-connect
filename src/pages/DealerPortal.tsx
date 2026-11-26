import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Dealer, Product, Category, CustomerRequest, Application, Transaction, Installment, Offer as OfferType, RevenueEntry } from '@/lib/types';
import { formatPKR, formatDate, DURATIONS, downloadCSV, cx } from '@/lib/utils';
import { Card, Button, Badge, StatusBadge, Spinner, EmptyState, Modal, Input, Select, Textarea, StatCard } from '@/components/ui';
import { LayoutDashboard, Package, Inbox, Receipt, Wallet, Plus, Pencil, Check, X, FileDown, Store } from 'lucide-react';

type Tab = 'overview' | 'products' | 'leads' | 'transactions' | 'commission';

export default function DealerPortal() {
  const { profile } = useAuth();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [registerOpen, setRegisterOpen] = useState(false);

  const loadDealer = useCallback(async () => {
    const { data } = await supabase.from('dealers').select('*, category:categories(name)').maybeSingle();
    setDealer((data as Dealer) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { loadDealer(); }, [loadDealer]);

  if (loading) return <Spinner />;

  if (!dealer) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={<Store className="h-12 w-12" />}
          title="Register your business"
          hint="Create your dealer profile to start receiving customer leads."
        />
        <div className="mt-4 text-center">
          <Button size="lg" onClick={() => setRegisterOpen(true)}><Plus className="h-4 w-4" /> Register dealer account</Button>
        </div>
        <DealerRegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} onDone={loadDealer} />
      </div>
    );
  }

  if (dealer.status !== 'active') {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center">
        <Badge className={dealer.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}>{dealer.status}</Badge>
        <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{dealer.business_name}</h2>
        <p className="mt-2 text-sm text-gray-500">
          {dealer.status === 'pending'
            ? 'Your dealer account is awaiting approval by the platform admin. You will be notified once verified.'
            : 'Your dealer account is currently suspended. Contact platform support for assistance.'}
        </p>
      </Card>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'leads', label: 'Leads & Offers', icon: Inbox },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'commission', label: 'Commission', icon: Wallet },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{dealer.business_name} · Active</Badge>
      </div>

      {tab === 'overview' && <DealerOverview dealer={dealer} />}
      {tab === 'products' && <DealerProducts dealer={dealer} />}
      {tab === 'leads' && <DealerLeads dealer={dealer} />}
      {tab === 'transactions' && <DealerTransactions dealer={dealer} />}
      {tab === 'commission' && <DealerCommission dealer={dealer} />}
    </div>
  );
}

function DealerRegisterModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({ business_name: '', owner_name: '', phone: '', shop_address: '', service_areas: '', category_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setCats((data as Category[]) ?? []));
  }, []);

  const submit = async () => {
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not signed in'); setSaving(false); return; }
    const { error: err } = await supabase.from('dealers').insert({
      owner_id: user.id,
      business_name: form.business_name,
      owner_name: form.owner_name,
      phone: form.phone,
      shop_address: form.shop_address,
      service_areas: form.service_areas,
      category_id: form.category_id || null,
      status: 'pending',
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Dealer registration">
      <div className="space-y-3">
        <Input label="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        <Input label="Owner name" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
        <Input label="Mobile number" placeholder="+92 3XX XXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Textarea label="Shop address" rows={2} value={form.shop_address} onChange={(e) => setForm({ ...form, shop_address: e.target.value })} />
        <Input label="Service areas (comma separated)" value={form.service_areas} onChange={(e) => setForm({ ...form, service_areas: e.target.value })} />
        <Select label="Business category" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Select category…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <p className="text-xs text-gray-400">Your registration will be reviewed by the platform admin before activation.</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.business_name || !form.owner_name}>{saving ? 'Submitting…' : 'Submit for review'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function DealerOverview({ dealer }: { dealer: Dealer }) {
  const [stats, setStats] = useState({ products: 0, leads: 0, newLeads: 0, pendingOffers: 0, approvedApps: 0, activeTxns: 0, commissionPayable: 0, commissionPaid: 0, totalSales: 0 });

  useEffect(() => {
    (async () => {
      const [p, r, o, a, t] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('dealer_id', dealer.id),
        supabase.from('customer_requests').select('status').eq('dealer_id', dealer.id),
        supabase.from('offers').select('status').eq('dealer_id', dealer.id),
        supabase.from('applications').select('status').eq('dealer_id', dealer.id),
        supabase.from('transactions').select('agreed_price, commission_amount, commission_status, status').eq('dealer_id', dealer.id),
      ]);
      const reqs = (r.data ?? []) as { status: string }[];
      const offs = (o.data ?? []) as { status: string }[];
      const txns = (t.data ?? []) as { agreed_price: number; commission_amount: number; commission_status: string; status: string }[];
      setStats({
        products: p.count ?? 0,
        leads: reqs.length,
        newLeads: reqs.filter((x) => x.status === 'new').length,
        pendingOffers: offs.filter((x) => x.status === 'pending').length,
        approvedApps: ((a.data ?? []) as { status: string }[]).filter((x) => x.status === 'approved' || x.status === 'verification').length,
        activeTxns: txns.filter((x) => x.status === 'active').length,
        commissionPayable: txns.filter((x) => x.commission_status === 'pending').reduce((s, x) => s + Number(x.commission_amount), 0),
        commissionPaid: txns.filter((x) => x.commission_status === 'received').reduce((s, x) => s + Number(x.commission_amount), 0),
        totalSales: txns.reduce((s, x) => s + Number(x.agreed_price), 0),
      });
    })();
  }, [dealer.id]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Package className="h-5 w-5" />} label="Product listings" value={stats.products} />
        <StatCard icon={<Inbox className="h-5 w-5" />} label="Total leads" value={stats.leads} sub={`${stats.newLeads} new`} accent="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" />
        <StatCard icon={<Check className="h-5 w-5" />} label="Pending offers" value={stats.pendingOffers} accent="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Active transactions" value={stats.activeTxns} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Total sales" value={formatPKR(stats.totalSales)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Commission payable" value={formatPKR(stats.commissionPayable)} accent="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" />
        <StatCard icon={<Check className="h-5 w-5" />} label="Commission paid" value={formatPKR(stats.commissionPaid)} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <StatCard icon={<Store className="h-5 w-5" />} label="Subscription" value={`${dealer.subscription_plan} plan`} sub={dealer.subscription_expires_at ? `expires ${formatDate(dealer.subscription_expires_at)}` : ''} accent="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" />
      </div>
      <Card className="p-4 text-sm text-gray-500 dark:text-gray-400">
        <p><strong className="dark:text-white">Your commission rate:</strong> {dealer.commission_type === 'percentage' ? `${dealer.commission_value}% per successful deal` : formatPKR(dealer.commission_value) + ' per deal'} (set by platform admin).</p>
      </Card>
    </div>
  );
}

function DealerProducts({ dealer }: { dealer: Dealer }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('products').select('*, category:categories(name)').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
    ]);
    setProducts((p.data as Product[]) ?? []);
    setCats((c.data as Category[]) ?? []);
    setLoading(false);
  }, [dealer.id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const values = {
      dealer_id: dealer.id,
      category_id: editing.category_id,
      name: editing.name,
      brand: editing.brand ?? '',
      model: editing.model ?? '',
      description: editing.description ?? '',
      specifications: editing.specifications ?? [],
      cash_price: Number(editing.cash_price ?? 0),
      installment_price: Number(editing.installment_price ?? 0),
      advance_payment: Number(editing.advance_payment ?? 0),
      monthly_installment: Number(editing.monthly_installment ?? 0),
      durations: editing.durations?.length ? editing.durations : [3, 6, 9, 12],
      stock: Number(editing.stock ?? 0),
      is_active: editing.is_active ?? true,
      is_featured: editing.is_featured ?? false,
    };
    if (editing.id) await supabase.from('products').update(values).eq('id', editing.id);
    else await supabase.from('products').insert(values);
    setSaving(false);
    setEditing(null);
    await load();
  };

  const toggle = async (p: Product, field: 'is_active' | 'is_featured') => {
    await supabase.from('products').update({ [field]: !p[field] }).eq('id', p.id);
    await load();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    await load();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ durations: [3, 6, 9, 12], specifications: [] })}><Plus className="h-4 w-4" /> Add product</Button>
      </div>
      {products.length === 0 ? (
        <EmptyState icon={<Package className="h-10 w-10" />} title="No products yet" hint="Add your first listing to appear in the marketplace." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-900/50 dark:border-gray-700">
              <th className="px-4 py-3">Product</th><th className="px-4">Cash</th><th className="px-4">Monthly</th><th className="px-4">Stock</th><th className="px-4">Status</th><th className="px-4">Actions</th>
            </tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category?.name}</p>
                  </td>
                  <td className="px-4 dark:text-gray-300">{formatPKR(p.cash_price)}</td>
                  <td className="px-4 text-teal-600">{formatPKR(p.monthly_installment)}</td>
                  <td className="px-4 dark:text-gray-300">{p.stock}</td>
                  <td className="px-4">
                    <button onClick={() => toggle(p, 'is_active')}><StatusBadge status={p.is_active ? 'active' : 'expired'} /></button>
                    {p.is_featured && <Badge className="ml-1 bg-amber-100 text-amber-700">Featured</Badge>}
                  </td>
                  <td className="px-4">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(p, 'is_featured')}>{p.is_featured ? <X className="h-3.5 w-3.5" /> : '★'}</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p)}><X className="h-3.5 w-3.5 text-rose-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit product' : 'Add product'} wide>
        {editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Product name" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Select label="Category" value={editing.category_id ?? ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
              <option value="">Select…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Brand" value={editing.brand ?? ''} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} />
            <Input label="Model" value={editing.model ?? ''} onChange={(e) => setEditing({ ...editing, model: e.target.value })} />
            <Input label="Cash price (PKR)" type="number" value={editing.cash_price ?? ''} onChange={(e) => setEditing({ ...editing, cash_price: Number(e.target.value) })} />
            <Input label="Installment price (PKR)" type="number" value={editing.installment_price ?? ''} onChange={(e) => setEditing({ ...editing, installment_price: Number(e.target.value) })} />
            <Input label="Advance payment (PKR)" type="number" value={editing.advance_payment ?? ''} onChange={(e) => setEditing({ ...editing, advance_payment: Number(e.target.value) })} />
            <Input label="Monthly installment (PKR)" type="number" value={editing.monthly_installment ?? ''} onChange={(e) => setEditing({ ...editing, monthly_installment: Number(e.target.value) })} />
            <Input label="Stock" type="number" value={editing.stock ?? ''} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Available durations</span>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((d) => {
                  const on = editing.durations?.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const cur = editing.durations ?? [];
                        setEditing({ ...editing, durations: on ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b) });
                      }}
                      className={cx('rounded-lg border px-2.5 py-1.5 text-xs font-medium', on ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400')}
                    >
                      {d}m
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Textarea label="Description" rows={3} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active listing
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={editing.is_featured ?? false} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> Featured
              </label>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !editing.name || !editing.category_id}>{saving ? 'Saving…' : 'Save product'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DealerLeads({ dealer }: { dealer: Dealer }) {
  const [leads, setLeads] = useState<(CustomerRequest & { product?: Product })[]>([]);
  const [apps, setApps] = useState<(Application & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [offerFor, setOfferFor] = useState<CustomerRequest | null>(null);
  const [offer, setOffer] = useState({ installment_price: 0, advance_amount: 0, monthly_installment: 0, duration_months: 12, notes: '' });

  const load = useCallback(async () => {
    const [r, a] = await Promise.all([
      supabase.from('customer_requests').select('*, product:products(id, name, cash_price, installment_price, advance_payment, monthly_installment, durations)').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
      supabase.from('applications').select('*, product:products(id, name)').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
    ]);
    setLeads((r.data as CustomerRequest[]) ?? []);
    setApps((a.data as Application[]) ?? []);
    setLoading(false);
  }, [dealer.id]);

  useEffect(() => { load(); }, [load]);

  const openOffer = (r: CustomerRequest) => {
    const p = r.product;
    setOfferFor(r);
    setOffer({
      installment_price: p?.installment_price ?? 0,
      advance_amount: p?.advance_payment ?? 0,
      monthly_installment: p?.monthly_installment ?? 0,
      duration_months: r.duration_months ?? p?.durations?.[0] ?? 12,
      notes: '',
    });
  };

  const submitOffer = async () => {
    if (!offerFor) return;
    setOfferFor(offerFor); // keep modal open while saving
    const { error } = await supabase.from('offers').insert({
      request_id: offerFor.id,
      dealer_id: offerFor.dealer_id,
      customer_id: offerFor.customer_id,
      product_id: offerFor.product_id,
      cash_price: offerFor.product?.cash_price ?? null,
      ...offer,
    });
    if (!error) {
      await supabase.from('customer_requests').update({ status: 'accepted' }).eq('id', offerFor.id);
      await supabase.from('notifications').insert({
        user_id: offerFor.customer_id,
        title: 'New offer received',
        body: `${dealer.business_name} offered ${formatPKR(offer.monthly_installment)}/mo for ${offer.duration_months} months on ${offerFor.product?.name}.`,
        type: 'offer',
      });
    }
    setOfferFor(null);
    await load();
  };

  const decideLead = async (r: CustomerRequest, status: 'accepted' | 'rejected') => {
    await supabase.from('customer_requests').update({ status }).eq('id', r.id);
    if (status === 'accepted') openOffer(r);
    else await load();
  };

  const updateApp = async (a: Application, status: Application['status']) => {
    await supabase.from('applications').update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null }).eq('id', a.id);
    if (status === 'completed') {
      const { data: txn } = await supabase.from('transactions').select('*').eq('application_id', a.id).maybeSingle();
      if (txn) {
        await supabase.from('transactions').update({ status: 'completed', completion_date: new Date().toISOString() }).eq('id', txn.id);
        await supabase.from('installments').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('transaction_id', txn.id).eq('status', 'due');
      }
    }
    await load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 font-bold text-gray-900 dark:text-white">Incoming leads ({leads.filter((l) => l.status === 'new').length} new)</h3>
        {leads.length === 0 ? (
          <EmptyState icon={<Inbox className="h-10 w-10" />} title="No leads yet" hint="Customer requests for your products will appear here." />
        ) : (
          <div className="space-y-3">
            {leads.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{r.product?.name}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {r.request_type === 'installment' ? `${r.duration_months} month plan` : 'Cash purchase'} · {formatDate(r.created_at)}
                    </p>
                    {r.message && <p className="mt-1 text-sm text-gray-500">"{r.message}"</p>}
                  </div>
                  {r.status === 'new' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => decideLead(r, 'rejected')}><X className="h-3.5 w-3.5" /> Reject</Button>
                      <Button size="sm" onClick={() => decideLead(r, 'accepted')}><Check className="h-3.5 w-3.5" /> Accept & offer</Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-bold text-gray-900 dark:text-white">Applications ({apps.length})</h3>
        {apps.length === 0 ? (
          <EmptyState icon={<Receipt className="h-10 w-10" />} title="No applications" hint="Accepted offers become applications for verification and approval." />
        ) : (
          <div className="space-y-3">
            {apps.map((a) => (
              <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{a.product?.name}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatPKR(a.monthly_installment)}/mo × {a.duration_months} · advance {formatPKR(a.advance_amount)} · applied {formatDate(a.created_at)}
                  </p>
                  {a.document_urls?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.document_urls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline">Document {i + 1}</a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === 'verification' && (
                    <>
                      <Button size="sm" variant="success" onClick={() => updateApp(a, 'approved')}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => updateApp(a, 'rejected')}>Reject</Button>
                    </>
                  )}
                  {a.status === 'approved' && (
                    <Button size="sm" onClick={() => updateApp(a, 'delivered')}>Mark delivered</Button>
                  )}
                  {a.status === 'delivered' && (
                    <Button size="sm" variant="success" onClick={() => updateApp(a, 'completed')}>Complete deal</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal open={!!offerFor} onClose={() => setOfferFor(null)} title={`Submit offer — ${offerFor?.product?.name ?? ''}`}>
        <div className="space-y-3">
          <Input label="Installment price (PKR)" type="number" value={offer.installment_price} onChange={(e) => setOffer({ ...offer, installment_price: Number(e.target.value) })} />
          <Input label="Advance payment (PKR)" type="number" value={offer.advance_amount} onChange={(e) => setOffer({ ...offer, advance_amount: Number(e.target.value) })} />
          <Input label="Monthly installment (PKR)" type="number" value={offer.monthly_installment} onChange={(e) => setOffer({ ...offer, monthly_installment: Number(e.target.value) })} />
          <Select label="Duration (months)" value={offer.duration_months} onChange={(e) => setOffer({ ...offer, duration_months: Number(e.target.value) })}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} months</option>)}
          </Select>
          <Textarea label="Notes to customer" rows={2} value={offer.notes} onChange={(e) => setOffer({ ...offer, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOfferFor(null)}>Cancel</Button>
            <Button onClick={submitOffer}>Send offer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DealerTransactions({ dealer }: { dealer: Dealer }) {
  const [txns, setTxns] = useState<(Transaction & { product?: Product })[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [t, i] = await Promise.all([
        supabase.from('transactions').select('*, product:products(id, name)').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
        supabase.from('installments').select('*').eq('dealer_id', dealer.id).order('due_date'),
      ]);
      setTxns((t.data as Transaction[]) ?? []);
      setInstallments((i.data as Installment[]) ?? []);
      setLoading(false);
    })();
  }, [dealer.id]);

  const markPaid = async (inst: Installment) => {
    await supabase.from('installments').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', inst.id);
    setInstallments((list) => list.map((x) => (x.id === inst.id ? { ...x, status: 'paid', paid_date: new Date().toISOString().slice(0, 10) } : x)));
  };

  if (loading) return <Spinner />;
  if (!txns.length) return <EmptyState icon={<Receipt className="h-10 w-10" />} title="No transactions yet" />;

  return (
    <div className="space-y-3">
      {txns.map((t) => {
        const insts = installments.filter((i) => i.transaction_id === t.id);
        return (
          <Card key={t.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{t.product?.name}</p>
                  <StatusBadge status={t.status} />
                  <Badge className={t.commission_status === 'received' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}>
                    commission {t.commission_status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{t.transaction_ref} · {formatPKR(t.agreed_price)} · commission {formatPKR(t.commission_amount)} · {formatDate(t.created_at)}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                {expanded === t.id ? 'Hide schedule' : `Installments (${insts.filter((i) => i.status === 'paid').length}/${insts.length})`}
              </Button>
            </div>
            {expanded === t.id && (
              <div className="mt-3 overflow-x-auto rounded-lg border dark:border-gray-700">
                <table className="w-full min-w-[520px] text-sm">
                  <thead><tr className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-900/50"><th className="px-3 py-2">#</th><th className="px-3">Due</th><th className="px-3">Amount</th><th className="px-3">Status</th><th className="px-3"></th></tr></thead>
                  <tbody>
                    {insts.map((i) => (
                      <tr key={i.id} className="border-t dark:border-gray-700">
                        <td className="px-3 py-1.5 dark:text-gray-300">{i.installment_no}</td>
                        <td className="px-3 dark:text-gray-300">{formatDate(i.due_date)}</td>
                        <td className="px-3 dark:text-gray-300">{formatPKR(i.amount)}</td>
                        <td className="px-3"><StatusBadge status={i.status} /></td>
                        <td className="px-3 text-right">
                          {i.status !== 'paid' && <Button size="sm" variant="success" onClick={() => markPaid(i)}>Mark paid</Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function DealerCommission({ dealer }: { dealer: Dealer }) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('transactions').select('*, product:products(id, name)').eq('dealer_id', dealer.id).order('created_at', { ascending: false })
      .then(({ data }) => { setTxns((data as Transaction[]) ?? []); setLoading(false); });
  }, [dealer.id]);

  if (loading) return <Spinner />;

  const payable = txns.filter((t) => t.commission_status === 'pending').reduce((s, t) => s + Number(t.commission_amount), 0);
  const paid = txns.filter((t) => t.commission_status === 'received').reduce((s, t) => s + Number(t.commission_amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Commission payable" value={formatPKR(payable)} accent="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" />
        <StatCard icon={<Check className="h-5 w-5" />} label="Commission paid" value={formatPKR(paid)} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Rate" value={dealer.commission_type === 'percentage' ? `${dealer.commission_value}%` : formatPKR(dealer.commission_value)} />
      </div>
      <Card className="overflow-x-auto">
        {txns.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">No commission records yet.</p> : (
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-900/50 dark:border-gray-700">
              <th className="px-4 py-3">Reference</th><th className="px-4">Deal value</th><th className="px-4">Commission</th><th className="px-4">Status</th><th className="px-4">Date</th>
            </tr></thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b last:border-0 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium dark:text-white">{t.transaction_ref}</td>
                  <td className="px-4 dark:text-gray-300">{formatPKR(t.agreed_price)}</td>
                  <td className="px-4 dark:text-gray-300">{formatPKR(t.commission_amount)} <span className="text-xs text-gray-400">({t.commission_type === 'percentage' ? `${t.commission_value}%` : 'fixed'})</span></td>
                  <td className="px-4"><Badge className={t.commission_status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{t.commission_status}</Badge></td>
                  <td className="px-4 dark:text-gray-300">{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => downloadCSV('commission-report.csv', txns.map((t) => ({
          reference: t.transaction_ref, deal_value: t.agreed_price, commission: t.commission_amount, status: t.commission_status, date: t.created_at.slice(0, 10),
        })))}>
          <FileDown className="h-4 w-4" /> Export commission report (CSV)
        </Button>
      </div>
    </div>
  );
}
