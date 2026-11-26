import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, useTheme } from '@/lib/auth';
import type { Product, Settings } from '@/lib/types';
import { cx, isValidPKPhone, normalizePKPhone } from '@/lib/utils';
import { Button, Input, Modal, Spinner } from '@/components/ui';
import Marketplace, { CategoryStrip } from '@/pages/Marketplace';
import { ProductDetail } from '@/pages/ProductDetail';
import CustomerDashboard from '@/pages/CustomerDashboard';
import DealerPortal from '@/pages/DealerPortal';
import AdminDashboard from '@/pages/AdminDashboard';
import {
  Store, LayoutDashboard, ShoppingCart, UserRound, Moon, Sun, LogIn, LogOut, Bell,
} from 'lucide-react';

type View = 'marketplace' | 'product' | 'dashboard' | 'portal' | 'admin';

export default function AppShell() {
  const { session, profile, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [view, setView] = useState<View>('marketplace');
  const [productId, setProductId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [unread, setUnread] = useState(0);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'admin_staff';
  const isDealer = profile?.role === 'dealer_owner' || profile?.role === 'dealer_staff';

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setSettings((data as Settings) ?? null));
  }, []);

  useEffect(() => {
    if (!session?.user) { setUnread(0); return; }
    const load = () =>
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false)
        .then(({ count }) => setUnread(count ?? 0));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [session?.user?.id]);

  useEffect(() => {
    if (view === 'dashboard' && !session) setView('marketplace');
  }, [session, view]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;

  const openProduct = (p: Product) => { setProductId(p.id); setView('product'); };

  const navBtn = (active: boolean) =>
    cx('flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
      active ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button className="flex items-center gap-2" onClick={() => { setView('marketplace'); setProductId(null); }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 font-black text-white">Q</div>
            <div className="text-left">
              <p className="leading-tight font-bold">{settings?.platform_name ?? 'Qist Connect'}</p>
              <p className="hidden text-[10px] leading-tight text-gray-400 sm:block">{settings?.tagline ?? 'One Platform – Multiple Dealers – Unlimited Opportunities.'}</p>
            </div>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            <button className={navBtn(view === 'marketplace' || view === 'product')} onClick={() => { setView('marketplace'); setProductId(null); }}>
              <ShoppingCart className="h-4 w-4" /> Marketplace
            </button>
            {session && (
              <button className={navBtn(view === 'dashboard')} onClick={() => setView('dashboard')}>
                <LayoutDashboard className="h-4 w-4" /> My Account
              </button>
            )}
            {isDealer && (
              <button className={navBtn(view === 'portal')} onClick={() => setView('portal')}>
                <Store className="h-4 w-4" /> Dealer Portal
              </button>
            )}
            {isSuperAdmin && (
              <button className={navBtn(view === 'admin')} onClick={() => setView('admin')}>
                <LayoutDashboard className="h-4 w-4" /> Admin
              </button>
            )}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {session && (
              <button onClick={() => setView('dashboard')} className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                <Bell className="h-4 w-4" />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
              </button>
            )}
            {session ? (
              <div className="flex items-center gap-1.5">
                <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{profile?.full_name || session.user.email}</span>
                <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}><LogIn className="h-4 w-4" /> Sign in</Button>
            )}
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 dark:border-gray-700 md:hidden">
          <button className={navBtn(view === 'marketplace' || view === 'product')} onClick={() => { setView('marketplace'); setProductId(null); }}>Marketplace</button>
          {session && <button className={navBtn(view === 'dashboard')} onClick={() => setView('dashboard')}>My Account</button>}
          {isDealer && <button className={navBtn(view === 'portal')} onClick={() => setView('portal')}>Dealer</button>}
          {isSuperAdmin && <button className={navBtn(view === 'admin')} onClick={() => setView('admin')}>Admin</button>}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === 'marketplace' && (
          <>
            <CategoryStripOnTop onSelect={(catId) => {
              const el = document.getElementById('category-select');
              if (el) { (el as HTMLSelectElement).value = catId; el.dispatchEvent(new Event('change', { bubbles: true })); }
            }} />
            <Marketplace onProduct={openProduct} />
          </>
        )}
        {view === 'product' && productId && <ProductDetail productId={productId} onBack={() => setView('marketplace')} />}
        {view === 'dashboard' && session && (
          profile?.role === 'customer' || !isDealer && !isSuperAdmin
            ? <CustomerDashboard onBrowse={() => { setView('marketplace'); setProductId(null); }} />
            : <CustomerDashboard onBrowse={() => { setView('marketplace'); setProductId(null); }} />
        )}
        {view === 'portal' && isDealer && <DealerPortal />}
        {view === 'admin' && isSuperAdmin && <AdminDashboard />}
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-gray-700">
        {settings?.platform_name ?? 'Qist Connect'} · {settings?.tagline ?? ''} — Serving {settings?.cities?.join(', ') ?? 'Karachi'} · Support {settings?.support_phone || 'coming soon'}
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function CategoryStripOnTop({ onSelect }: { onSelect: (id: string) => void }) {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [active, setActive] = useState('');
  useEffect(() => {
    supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order').then(({ data }) => setCats((data as { id: string; name: string }[]) ?? []));
  }, []);
  return (
    <div className="mb-5">
      <CategoryStrip
        categories={cats as never[]}
        active={active}
        onSelect={(id) => {
          setActive(id);
          onSelect(id === active ? '' : id);
        }}
      />
    </div>
  );
}

function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        if (!fullName.trim()) throw new Error('Please enter your name.');
        if (!isValidPKPhone(phone)) throw new Error('Enter a valid Pakistani mobile number (03XX XXXXXXX).');
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone: normalizePKPhone(phone), role: 'customer' } },
        });
        if (err) throw err;
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'signin' ? 'Sign in' : 'Create customer account'}>
      <div className="space-y-3">
        {mode === 'signup' && (
          <>
            <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Mobile number" placeholder="03XX XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </>
        )}
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={busy || !email || !password}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-gray-500">
          {mode === 'signin' ? "New to Qist Connect? " : 'Already have an account? '}
          <button className="font-semibold text-teal-600 hover:underline" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </Modal>
  );
}
