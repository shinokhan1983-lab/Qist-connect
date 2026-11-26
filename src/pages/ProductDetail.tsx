import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Offer, Product, Dealer, Category } from '@/lib/types';
import { formatPKR, DURATIONS, cx } from '@/lib/utils';
import { Card, Button, Modal, Input, Select, Textarea, Badge, Spinner, EmptyState } from '@/components/ui';
import { ProductImage, useMarketplace } from '@/pages/Marketplace';
import { Star, MapPin, Timer, Send, ChevronLeft, Store, ShieldCheck, Info, Scale } from 'lucide-react';

export function ProductDetail({ productId, onBack }: { productId: string; onBack: () => void }) {
  const { products, loading } = useMarketplace();
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [duration, setDuration] = useState(12);

  useEffect(() => {
    if (loading) return;
    const p = products.find((x) => x.id === productId) ?? null;
    setProduct(p);
    if (p) {
      setSimilar(products.filter((x) => x.category_id === p.category_id && x.id !== p.id && x.dealer?.status === 'active' && x.is_active).slice(0, 4));
    }
  }, [productId, products, loading]);

  if (loading) return <Spinner />;
  if (!product) return <EmptyState icon={<Info />} title="Product not found" hint="It may no longer be available." />;

  const totalInstallment = product.monthly_installment * duration;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-teal-600 dark:text-gray-400">
        <ChevronLeft className="h-4 w-4" /> Back to marketplace
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <ProductImage product={product} className="h-64 w-full sm:h-80" />
          <div className="grid grid-cols-4 gap-1 p-2">
            {[0, 1, 2, 3].map((i) => (
              <ProductImage key={i} product={product} className="h-16 w-full rounded-lg opacity-80" />
            ))}
          </div>
        </Card>

        <div>
          <p className="text-sm font-medium text-teal-600 dark:text-teal-400">{product.category?.name}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
          <p className="text-sm text-gray-500">{product.brand} {product.model && `· ${product.model}`}</p>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <strong>{(product.dealer?.rating_avg ?? 0) > 0 ? product.dealer!.rating_avg.toFixed(1) : 'New'}</strong>
              <span className="text-gray-400">({product.dealer?.rating_count ?? 0})</span>
            </span>
            <span className="flex items-center gap-1 text-gray-500"><MapPin className="h-4 w-4" /> {product.dealer?.city}</span>
            {product.dealer?.response_time_minutes && (
              <span className="flex items-center gap-1 text-gray-500"><Timer className="h-4 w-4" /> ~{product.dealer.response_time_minutes}min response</span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Card className="p-3">
              <p className="text-xs text-gray-500">Cash price</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPKR(product.cash_price)}</p>
            </Card>
            <Card className="border-teal-200 bg-teal-50/50 p-3 dark:border-teal-700/50 dark:bg-teal-900/20">
              <p className="text-xs text-teal-700 dark:text-teal-400">Installment price</p>
              <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{formatPKR(product.installment_price)}</p>
            </Card>
          </div>

          <Card className="mt-3 p-4">
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Available plans</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {product.durations.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cx(
                    'rounded-lg border px-2 py-2 text-center text-xs transition',
                    duration === d
                      ? 'border-teal-500 bg-teal-50 font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
                      : 'border-gray-200 text-gray-600 hover:border-teal-300 dark:border-gray-600 dark:text-gray-300'
                  )}
                >
                  <span className="block font-semibold">{d} months</span>
                  <span className="text-[11px] text-gray-400">{formatPKR(Math.round((product.installment_price - product.advance_payment) / d))}/mo</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/50">
                <p className="text-gray-400">Advance</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{formatPKR(product.advance_payment)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/50">
                <p className="text-gray-400">Monthly</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{formatPKR(Math.round((product.installment_price - product.advance_payment) / duration))}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/50">
                <p className="text-gray-400">Total payable</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{formatPKR(product.advance_payment + Math.round((product.installment_price - product.advance_payment) / duration) * duration)}</p>
              </div>
            </div>
          </Card>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setRequestOpen(true)}>
              <Send className="h-4 w-4" /> Request installment
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setCompareOpen(true)}>
              <Scale className="h-4 w-4" /> Compare similar products
            </Button>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Submitting a request does not guarantee approval or product delivery. Final terms depend on dealer verification and policy.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-2 font-bold text-gray-900 dark:text-white">Description</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{product.description}</p>
          {product.specifications?.length > 0 && (
            <>
              <h2 className="mb-2 mt-4 font-bold text-gray-900 dark:text-white">Specifications</h2>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {product.specifications.map((s, i) => (
                  <div key={i} className="flex justify-between border-b border-dashed border-gray-100 py-1 dark:border-gray-700">
                    <dt className="text-gray-500">{s.k}</dt>
                    <dd className="font-medium text-gray-800 dark:text-gray-200">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold text-gray-900 dark:text-white"><Store className="h-4 w-4" /> Seller</h2>
          <p className="font-semibold text-gray-800 dark:text-gray-200">{product.dealer?.business_name}</p>
          <p className="text-xs text-gray-500">{product.dealer?.owner_name}</p>
          <div className="mt-3 space-y-1.5 text-xs text-gray-500">
            <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified dealer</p>
            <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {product.dealer?.shop_address}</p>
          </div>
          <p className="mt-3 text-xs text-gray-400">Stock available: {product.stock}</p>
        </Card>
      </div>

      {similar.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">Similar products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {similar.map((p) => (
              <Card key={p.id} className="overflow-hidden p-3">
                <ProductImage product={p} className="mb-2 h-20 w-full rounded-lg" />
                <p className="line-clamp-1 text-sm font-semibold dark:text-white">{p.name}</p>
                <p className="text-xs text-gray-500">{p.dealer?.business_name}</p>
                <p className="mt-1 text-sm font-bold text-teal-600">{formatPKR(p.monthly_installment)}/mo</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <RequestModal product={product} open={requestOpen} onClose={() => setRequestOpen(false)} />
      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} products={[product, ...similar]} />
    </div>
  );
}

function CompareModal({ open, onClose, products }: { open: boolean; onClose: () => void; products: Product[] }) {
  return (
    <Modal open={open} onClose={onClose} title="Compare offers" wide>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-400 dark:border-gray-600">
              <th className="py-2 pr-3">Product</th>
              <th className="px-3">Dealer</th>
              <th className="px-3">Cash</th>
              <th className="px-3">Installment</th>
              <th className="px-3">Advance</th>
              <th className="px-3">Monthly</th>
              <th className="px-3">Rating</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0 dark:border-gray-700">
                <td className="py-2 pr-3 font-medium dark:text-white">{p.name}</td>
                <td className="px-3 text-gray-500">{p.dealer?.business_name}</td>
                <td className="px-3 dark:text-gray-300">{formatPKR(p.cash_price)}</td>
                <td className="px-3 dark:text-gray-300">{formatPKR(p.installment_price)}</td>
                <td className="px-3 dark:text-gray-300">{formatPKR(p.advance_payment)}</td>
                <td className="px-3 font-semibold text-teal-600">{formatPKR(p.monthly_installment)}</td>
                <td className="px-3 text-gray-500">{(p.dealer?.rating_avg ?? 0) > 0 ? p.dealer!.rating_avg.toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export function RequestModal({ product, open, onClose, onSubmitted }: { product: Product; open: boolean; onClose: () => void; onSubmitted?: () => void }) {
  const [type, setType] = useState<'installment' | 'cash'>('installment');
  const [duration, setDuration] = useState<number>(product?.durations?.[0] ?? 12);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (product) setDuration(product.durations?.[0] ?? 12);
  }, [product]);

  const submit = async () => {
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Please sign in as a customer to submit a request.');
      setSaving(false);
      return;
    }
    const { error: err } = await supabase.from('customer_requests').insert({
      customer_id: user.id,
      product_id: product.id,
      dealer_id: product.dealer_id,
      request_type: type,
      duration_months: type === 'installment' ? duration : null,
      message,
    });
    setSaving(false);
    if (err) {
      setError('Could not submit request: ' + err.message);
      return;
    }
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Request sent',
      body: `Your request for ${product.name} was sent to ${product.dealer?.business_name ?? 'the dealer'}.`,
      type: 'request',
    });
    setDone(true);
    onSubmitted?.();
  };

  if (!product) return null;
  return (
    <Modal open={open} onClose={() => { setDone(false); onClose(); }} title={done ? 'Request submitted' : `Request: ${product.name}`}>
      {done ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="font-semibold text-gray-800 dark:text-gray-200">Your request was sent to {product.dealer?.business_name}.</p>
          <p className="mt-1 text-sm text-gray-500">You will be notified when the dealer responds. Approval is not guaranteed.</p>
          <Button className="mt-4" onClick={() => { setDone(false); onClose(); }}>Done</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Select label="Request type" value={type} onChange={(e) => setType(e.target.value as 'installment' | 'cash')}>
            <option value="installment">Installment plan</option>
            <option value="cash">Full cash purchase</option>
          </Select>
          {type === 'installment' && (
            <Select label="Preferred duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {product.durations.map((d) => (
                <option key={d} value={d}>{d} months — approx {formatPKR(Math.round((product.installment_price - product.advance_payment) / d))}/mo</option>
              ))}
            </Select>
          )}
          <Textarea label="Message to dealer (optional)" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. I can pay 30,000 advance…" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Sending…' : 'Send request'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
