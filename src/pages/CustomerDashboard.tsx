import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { CustomerRequest, Offer, Application, Transaction, Installment, AppNotification, Profile } from '@/lib/types';
import { formatPKR, formatDate, cx } from '@/lib/utils';
import { Card, Button, Badge, StatusBadge, Spinner, EmptyState, Modal, Input, Textarea } from '@/components/ui';
import { Package, FileText, Receipt, Bell, User, LogOut, Check, X, MessageSquare } from 'lucide-react';

type Tab = 'requests' | 'offers' | 'applications' | 'transactions' | 'notifications' | 'profile';

export default function CustomerDashboard({ onBrowse }: { onBrowse: () => void }) {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('requests');

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'requests', label: 'My Requests', icon: FileText },
    { id: 'offers', label: 'Dealer Offers', icon: Package },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition',
              tab === t.id
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300'
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'requests' && <RequestsTab onBrowse={onBrowse} />}
      {tab === 'offers' && <OffersTab />}
      {tab === 'applications' && <ApplicationsTab />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
}

function RequestsTab({ onBrowse }: { onBrowse: () => void }) {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('customer_requests')
        .select('*, product:products(id, name, cash_price, monthly_installment), dealer:dealers(business_name)')
        .order('created_at', { ascending: false });
      setRequests((data as CustomerRequest[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  if (!requests.length)
    return <EmptyState icon={<Package className="h-10 w-10" />} title="No requests yet" hint="Browse the marketplace and request a product." />;

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{r.product?.name}</p>
            <p className="text-xs text-gray-500">
              {r.dealer?.business_name} · {r.request_type === 'installment' ? `${r.duration_months} months` : 'Cash'} · {formatDate(r.created_at)}
            </p>
            {r.message && <p className="mt-1 text-sm text-gray-500">"{r.message}"</p>}
          </div>
          <StatusBadge status={r.status} />
        </Card>
      ))}
    </div>
  );
}

function OffersTab() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('offers')
      .select('*, dealer:dealers(business_name, city, rating_avg), product:products(id, name, cash_price)')
      .order('created_at', { ascending: false });
    setOffers((data as Offer[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (offer: Offer, decision: 'accepted' | 'rejected') => {
    setAccepted(offer.id);
    await supabase.from('offers').update({ status: decision }).eq('id', offer.id);
    if (decision === 'accepted') {
      await supabase.from('customer_requests').update({ status: 'accepted' }).eq('id', offer.request_id);
      await supabase.from('notifications').insert({
        user_id: offer.customer_id,
        title: 'Offer accepted',
        body: `You accepted ${formatPKR(offer.monthly_installment)}/mo from ${offer.dealer?.business_name}. Complete verification next.`,
        type: 'offer',
      });
    }
    await load();
    setAccepted(null);
  };

  if (loading) return <Spinner />;
  const pending = offers.filter((o) => o.status === 'pending');
  const others = offers.filter((o) => o.status !== 'pending');

  return (
    <div className="space-y-5">
      {offers.length === 0 && (
        <EmptyState icon={<Package className="h-10 w-10" />} title="No offers yet" hint="Dealers will respond to your requests here." />
      )}

      {pending.length > 1 && (
        <Card className="border-teal-300 bg-teal-50/60 p-4 dark:border-teal-700 dark:bg-teal-900/20">
          <h3 className="mb-3 font-bold text-teal-800 dark:text-teal-300">Compare your {pending.length} offers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-teal-700/70 dark:text-teal-400/70">
                  <th className="py-1 pr-3">Dealer</th><th className="px-3">Advance</th><th className="px-3">Monthly</th><th className="px-3">Duration</th><th className="px-3">Total</th><th />
                </tr>
              </thead>
              <tbody>
                {pending.map((o) => (
                  <tr key={o.id} className="border-t border-teal-200/60 dark:border-teal-800">
                    <td className="py-2 pr-3 font-medium dark:text-white">{o.dealer?.business_name}</td>
                    <td className="px-3 dark:text-gray-300">{formatPKR(o.advance_amount)}</td>
                    <td className="px-3 font-bold text-teal-700 dark:text-teal-300">{formatPKR(o.monthly_installment)}</td>
                    <td className="px-3 dark:text-gray-300">{o.duration_months} mo</td>
                    <td className="px-3 dark:text-gray-300">{formatPKR(o.advance_amount + o.monthly_installment * o.duration_months)}</td>
                    <td className="px-3 text-right"><Button size="sm" onClick={() => respond(o, 'accepted')}>Accept</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pending.map((o) => (
        <OfferCard key={o.id} offer={o} onAccept={() => respond(o, 'accepted')} onReject={() => respond(o, 'rejected')} busy={accepted === o.id} />
      ))}

      {others.map((o) => (
        <OfferCard key={o.id} offer={o} />
      ))}
    </div>
  );
}

function OfferCard({ offer, onAccept, onReject, busy }: { offer: Offer; onAccept?: () => void; onReject?: () => void; busy?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 dark:text-white">{offer.product?.name}</p>
            <StatusBadge status={offer.status} />
          </div>
          <p className="text-xs text-gray-500">{offer.dealer?.business_name} · {offer.dealer?.city}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="text-gray-500">Advance <strong className="dark:text-white">{formatPKR(offer.advance_amount)}</strong></span>
            <span className="text-gray-500">Monthly <strong className="text-teal-600 dark:text-teal-400">{formatPKR(offer.monthly_installment)}</strong></span>
            <span className="text-gray-500">Duration <strong className="dark:text-white">{offer.duration_months} months</strong></span>
            <span className="text-gray-500">Total <strong className="dark:text-white">{formatPKR(offer.advance_amount + offer.monthly_installment * offer.duration_months)}</strong></span>
          </div>
          {offer.notes && <p className="mt-2 flex items-start gap-1 text-sm text-gray-500"><MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {offer.notes}</p>}
        </div>
        {offer.status === 'pending' && onAccept && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onReject} disabled={busy}><X className="h-4 w-4" /> Reject</Button>
            <Button onClick={onAccept} disabled={busy}><Check className="h-4 w-4" /> Accept offer</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function ApplicationsTab() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsFor, setDocsFor] = useState<Application | null>(null);
  const [docUrl, setDocUrl] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('applications')
      .select('*, product:products(id, name), dealer:dealers(business_name, phone)')
      .order('created_at', { ascending: false });
    setApps((data as Application[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDoc = async () => {
    if (!docsFor || !docUrl.trim()) return;
    setSavingDoc(true);
    const urls = [...(docsFor.document_urls ?? []), docUrl.trim()];
    await supabase.from('applications').update({ document_urls: urls }).eq('id', docsFor.id);
    setDocUrl('');
    setSavingDoc(false);
    setDocsFor(null);
    await load();
  };

  if (loading) return <Spinner />;
  if (!apps.length)
    return <EmptyState icon={<FileText className="h-10 w-10" />} title="No applications" hint="Accept a dealer offer to start an application." />;

  return (
    <div className="space-y-3">
      {apps.map((a) => (
        <Card key={a.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 dark:text-white">{a.product?.name}</p>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-gray-500">{a.dealer?.business_name} · applied {formatDate(a.created_at)}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="text-gray-500">Price <strong className="dark:text-white">{formatPKR(a.agreed_price)}</strong></span>
                <span className="text-gray-500">Advance <strong className="dark:text-white">{formatPKR(a.advance_amount)}</strong></span>
                <span className="text-gray-500">Monthly <strong className="text-teal-600">{formatPKR(a.monthly_installment)}</strong> × {a.duration_months}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDocsFor(a)}>Documents ({a.document_urls?.length ?? 0})</Button>
              {a.status === 'verification' && <p className="text-xs text-amber-600">Awaiting dealer verification</p>}
              {a.status === 'approved' && <p className="text-xs text-emerald-600">Approved — dealer will arrange delivery</p>}
              {(a.status === 'approved' || a.status === 'verification') && a.dealer?.phone && (
                <a href={`tel:${a.dealer.phone}`} className="text-xs font-medium text-teal-600 hover:underline">Contact: {a.dealer.phone}</a>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Modal open={!!docsFor} onClose={() => setDocsFor(null)} title="Upload document link">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Paste a secure link to your document (CNIC, salary slip, utility bill). Only the dealer can see these.</p>
          <Input placeholder="https://…" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
          {docsFor?.document_urls?.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer" className="block truncate text-xs text-teal-600 hover:underline">{u}</a>
          ))}
          <div className="flex justify-end"><Button onClick={addDoc} disabled={savingDoc || !docUrl.trim()}>{savingDoc ? 'Saving…' : 'Add document'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function TransactionsTab() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<Transaction | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    (async () => {
      const { user } = (await supabase.auth.getUser()).data;
      if (!user) { setLoading(false); return; }
      const [tRes, iRes] = await Promise.all([
        supabase.from('transactions').select('*, product:products(id, name), dealer:dealers(business_name)').order('created_at', { ascending: false }),
        supabase.from('installments').select('*').order('due_date'),
      ]);
      setTxns((tRes.data as Transaction[]) ?? []);
      setInstallments((iRes.data as Installment[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const submitReview = async () => {
    if (!reviewFor) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('reviews').insert({
      customer_id: user.id,
      dealer_id: reviewFor.dealer_id,
      transaction_id: reviewFor.id,
      rating,
      comment,
    });
    const { data: revs } = await supabase.from('reviews').select('rating').eq('dealer_id', reviewFor.dealer_id);
    if (revs) {
      const avg = revs.reduce((s, r) => s + r.rating, 0) / revs.length;
      await supabase.from('dealers').update({ rating_avg: Math.round(avg * 100) / 100, rating_count: revs.length }).eq('id', reviewFor.dealer_id);
    }
    setReviewFor(null);
    setComment('');
  };

  if (loading) return <Spinner />;
  if (!txns.length)
    return <EmptyState icon={<Receipt className="h-10 w-10" />} title="No transactions" hint="Completed deals will appear here with their installment schedule." />;

  return (
    <div className="space-y-3">
      {txns.map((t) => {
        const insts = installments.filter((i) => i.transaction_id === t.id);
        const paid = insts.filter((i) => i.status === 'paid').length;
        const overdue = insts.filter((i) => i.status === 'overdue').length;
        const next = insts.find((i) => i.status === 'due');
        return (
          <Card key={t.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{t.product?.name}</p>
                  <StatusBadge status={t.status} />
                  <StatusBadge status={t.delivery_status} />
                </div>
                <p className="text-xs text-gray-500">{t.dealer?.business_name} · {t.transaction_ref} · {formatDate(t.created_at)}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span className="text-gray-500">Monthly <strong className="text-teal-600">{formatPKR(t.monthly_installment)}</strong> × {t.duration_months}</span>
                  <span className="text-gray-500">Paid <strong className="dark:text-white">{paid}/{t.duration_months}</strong></span>
                  {overdue > 0 && <Badge className="bg-rose-100 text-rose-700">{overdue} overdue</Badge>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                  {expanded === t.id ? 'Hide schedule' : 'View schedule'}
                </Button>
                {t.status === 'active' && (
                  <Button size="sm" variant="secondary" onClick={() => setReviewFor(t)}>Rate dealer</Button>
                )}
              </div>
            </div>
            {expanded === t.id && (
              <div className="mt-3 overflow-x-auto rounded-lg border dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-900/50"><th className="px-3 py-2">#</th><th className="px-3">Due date</th><th className="px-3">Amount</th><th className="px-3">Status</th></tr></thead>
                  <tbody>
                    {insts.map((i) => (
                      <tr key={i.id} className="border-t dark:border-gray-700">
                        <td className="px-3 py-1.5 dark:text-gray-300">{i.installment_no}</td>
                        <td className="px-3 dark:text-gray-300">{formatDate(i.due_date)}</td>
                        <td className="px-3 dark:text-gray-300">{formatPKR(i.amount)}</td>
                        <td className="px-3"><StatusBadge status={i.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {next && expanded === t.id && (
              <p className="mt-2 text-xs text-gray-500">Next installment due {formatDate(next.due_date)} — {formatPKR(next.amount)}</p>
            )}
          </Card>
        );
      })}

      <Modal open={!!reviewFor} onClose={() => setReviewFor(null)} title="Rate your dealer">
        <div className="space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}>
                <span className={cx('text-2xl', n <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600')}>★</span>
              </button>
            ))}
          </div>
          <Textarea label="Comment (optional)" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex justify-end"><Button onClick={submitReview}>Submit review</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function NotificationsTab() {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      setNotifs((data as AppNotification[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const markAll = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })));
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-2">
      {notifs.length > 0 && (
        <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={markAll}>Mark all read</Button></div>
      )}
      {notifs.length === 0 && <EmptyState icon={<Bell className="h-10 w-10" />} title="No notifications" />}
      {notifs.map((n) => (
        <Card key={n.id} className={cx('p-3', !n.is_read && 'border-teal-300 dark:border-teal-600')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{n.title}</p>
              <p className="text-sm text-gray-500">{n.body}</p>
            </div>
            {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ProfileTab() {
  const { profile, signOut } = useAuth();
  const [form, setForm] = useState({ full_name: '', phone: '', city: '', address: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name, phone: profile.phone, city: profile.city, address: profile.address });
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    await supabase.from('profiles').update(form).eq('id', profile.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="mx-auto max-w-lg p-5">
      <div className="space-y-3">
        <Input label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Input label="Mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 3XX XXXXXXX" />
        <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <Textarea label="Address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="flex items-center justify-between">
          <Button onClick={save}>{saved ? 'Saved ✓' : 'Save changes'}</Button>
          <Button variant="danger" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
        </div>
      </div>
    </Card>
  );
}
