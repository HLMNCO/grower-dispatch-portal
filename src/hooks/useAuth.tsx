import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Business {
  id: string;
  name: string;
  business_type: 'receiver' | 'supplier' | 'transporter';
  public_intake_token: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'staff' | 'supplier' | 'transporter' | null;
  business: Business | null;
  signOut: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  business: null,
  signOut: async () => {},
  refreshBusiness: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'staff' | 'supplier' | 'transporter' | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchRole(session.user.id);
          fetchBusiness(session.user.id);
        }, 0);
      } else {
        setRole(null);
        setBusiness(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        fetchBusiness(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    setRole((data?.role as 'staff' | 'supplier' | 'transporter') ?? null);
  };

  const fetchBusiness = async (userId: string) => {
    const { data } = await supabase
      .from('businesses')
      .select('id, name, business_type, public_intake_token')
      .eq('owner_id', userId)
      .maybeSingle();
    if (data) {
      setBusiness(data as Business);
    }
  };

  const refreshBusiness = async () => {
    if (user) await fetchBusiness(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, business, signOut, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}
