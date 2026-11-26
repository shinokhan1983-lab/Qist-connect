import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) fetchProfile(data.session.user.id);
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        (async () => {
          await fetchProfile(newSession.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => !!profile && roles.includes(profile.role),
    [profile]
  );

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile: () => fetchProfile(profile?.id ?? session?.user?.id ?? ''), hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useTheme() {
  const { profile, refreshProfile } = useAuth();
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('qc-theme') as 'light' | 'dark') || 'light'
  );

  const theme = profile?.theme ?? localTheme;

  const setTheme = useCallback(
    async (t: 'light' | 'dark') => {
      setLocalTheme(t);
      localStorage.setItem('qc-theme', t);
      if (profile) {
        await supabase.from('profiles').update({ theme: t }).eq('id', profile.id);
        await refreshProfile();
      }
    },
    [profile, refreshProfile]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  return { theme, setTheme };
}
