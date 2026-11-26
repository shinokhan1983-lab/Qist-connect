import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Product } from '@/lib/types';
import { formatPKR } from '@/lib/utils';
import { Search, Smartphone, Bike, Tv, Refrigerator, WashingMachine, AirVent, Fan, CookingPot, Sofa, Laptop, Monitor, Package, Star, ChevronRight } from 'lucide-react';
import { Card, Input, Select, Spinner, EmptyState, Badge } from '@/components/ui';

const ICONS: Record<string, typeof Package> = {
  Smartphone, Bike, Tv, Refrigerator, WashingMachine, AirVent, Fan, CookingPot, Sofa, Laptop, Monitor, Package,
};

export function ProductImage({ product, className }: { product: Product; className?: string }) {
  const initials = product.name.split(' ').slice(0, 2).map((w) => w[0]).join('');
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 via-sky-50 to-slate-100 dark:from-teal-950 dark:via-sky-950 dark:to-slate-900 ${className ?? ''}`}>
      <span className="select-none text-3xl font-black tracking-tight text-teal-600/40 dark:text-teal-300/30">{initials}</span>
      {product.is_featured && (
        <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow">FEATURED</span>
      )}
    </div>
  );
}

export function useMarketplace() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase
          .from('products')
          .select('*, dealer:dealers(id, business_name, city, rating_avg, rating_count, response_time_minutes, status, category_id), category:categories(id, name, slug, icon)')
          .order('created_at', { ascending: false }),
      ]);
      setCategories((catRes.data as Category[]) ?? []);
      setProducts((prodRes.data as Product[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return { categories, products, loading };
}

export function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
    >
      <ProductImage product={product} className="h-36 w-full" />
      <div className="p-3">
        <p className="text-xs font-medium text-teal-600 dark:text-teal-400">{product.category?.name}</p>
        <h3 className="mt-0.5 line-clamp-1 font-semibold text-gray-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300">{product.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {(product.dealer?.rating_avg ?? 0) > 0 ? product.dealer!.rating_avg.toFixed(1) : 'New'}
          <span className="truncate">· {product.dealer?.business_name}</span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-gray-400">Cash</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPKR(product.cash_price)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400">Installment</p>
            <p className="text-sm font-bold text-teal-600 dark:text-teal-400">{formatPKR(product.monthly_installment)}/mo</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Marketplace({ onProduct }: { onProduct: (p: Product) => void }) {
  const { categories, products, loading } = useMarketplace();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');

  const visible = products.filter((p) => p.dealer?.status === 'active' && p.is_active && p.stock > 0);

  const filtered = visible
    .filter((p) => {
      const q = query.trim().toLowerCase();
      const matchesQ = !q || [p.name, p.brand, p.model, p.description].some((f) => f?.toLowerCase().includes(q));
      const matchesCat = category === 'all' || p.category_id === category;
      return matchesQ && matchesCat;
    })
    .sort((a, b) => {
      if (sort === 'price-asc') return a.cash_price - b.cash_price;
      if (sort === 'price-desc') return b.cash_price - a.cash_price;
      if (sort === 'monthly') return a.monthly_installment - b.monthly_installment;
      if (sort === 'rating') return (b.dealer?.rating_avg ?? 0) - (a.dealer?.rating_avg ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const featured = visible.filter((p) => p.is_featured).slice(0, 4);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, brand, model or price…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-52">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="sm:w-44">
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="monthly">Lowest monthly</option>
          <option value="rating">Top rated dealers</option>
        </Select>
      </div>

      {!query && category === 'all' && featured.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            Featured products <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Sponsored</Badge>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => onProduct(p)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} from verified dealers
        </h2>
        {filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-10 w-10" />} title="No products found" hint="Try a different search or category." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => onProduct(p)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function CategoryStrip({ categories, active, onSelect }: { categories: Category[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((c) => {
        const Icon = ICONS[c.icon] ?? Package;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-4 py-3 text-xs font-medium transition ${
              active === c.id
                ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
                : 'border-gray-200 bg-white text-gray-600 hover:border-teal-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            <Icon className="h-5 w-5" />
            {c.name}
          </button>
        );
      })}
      <ChevronRight className="hidden" />
    </div>
  );
}
