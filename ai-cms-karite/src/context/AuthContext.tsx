import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type AppRole = "admin" | "operador" | "vendedor" | "solo_lectura";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;

  isAuthenticated: boolean;
  isAdmin: boolean;

  role: AppRole;
  displayName: string;

  canOperate: boolean;
  canSell: boolean;
  canRead: boolean;
  canManageUsers: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getRoleByEmail(email?: string | null): AppRole {
  if (email === "karite.insumos@gmail.com") {
    return "admin";
  }

  return "solo_lectura";
}

function getDisplayName(email?: string | null): string {
  if (!email) return "Usuario";

  if (email === "karite.insumos@gmail.com") {
    return "Administrador Karité";
  }

  return email;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error obteniendo sesión:", error);
      }

      if (!mounted) return;

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    setSession(data.session ?? null);
    setUser(data.user ?? null);
    setLoading(false);
  }

  async function signOut() {
    setLoading(true);

    await supabase.auth.signOut();

    setSession(null);
    setUser(null);
    setLoading(false);
  }

  const role = getRoleByEmail(user?.email);
  const displayName = getDisplayName(user?.email);

  const isAdmin = role === "admin";

  const canOperate =
    role === "admin" ||
    role === "operador";

  const canSell =
    role === "admin" ||
    role === "vendedor";

  const canRead =
    role === "admin" ||
    role === "operador" ||
    role === "vendedor" ||
    role === "solo_lectura";

  const canManageUsers = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,

        isAuthenticated: Boolean(session),
        isAdmin,

        role,
        displayName,

        canOperate,
        canSell,
        canRead,
        canManageUsers,

        signIn,
        signOut,

        login: signIn,
        logout: signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}