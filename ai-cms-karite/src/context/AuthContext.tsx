import type * as React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { AppRole, Profile } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  role: AppRole | null;
  isAdmin: boolean;
  canOperate: boolean;
  canSell: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,display_name,rol,activo')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    setProfile((data as Profile | null) ?? null);
  };

  const refreshProfile = async () => {
    if (session?.user.id) await loadProfile(session.user.id);
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!isMounted) return;
        setSession(data.session);
        if (data.session?.user.id) await loadProfile(data.session.user.id);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.activo ? profile.rol : null;
    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      role,
      isAdmin: role === 'admin',
      canOperate: role === 'admin' || role === 'operador',
      canSell: role === 'admin' || role === 'operador' || role === 'vendedor',
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      refreshProfile
    };
  }, [loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
