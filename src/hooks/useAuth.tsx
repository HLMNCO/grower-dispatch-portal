import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Business {
  id: string;
  name: string;
  business_type: 'receiver' | 'supplier' | 'transporter';
  public_intake_token: string | null;
  grower_code: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'staff' | 'supplier' | 'transporter' | null;
  roleLoaded: boolean;
  business: Business | null;
  signOut: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  roleLoaded: false,
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
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setRoleLoaded(false);
        setTimeout(() => {
          fetchRole(session.user.id);
          fetchBusiness(session.user.id);
        }, 0);
      } else {
        setRole(null);
        setRoleLoaded(false);
        setBusiness(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setRoleLoaded(false);
        fetchRole(session.user.id);
        fetchBusiness(session.user.id);
      } else {
        setLoading(false);
      }
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
    setRoleLoaded(true);
    setLoading(false);
  };

  const fetchBusiness = async (userId: string) => {
    const { data } = await supabase
      .from('businesses')
      .select('id, name, business_type, public_intake_token, grower_code')
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
    <AuthContext.Provider value={{ user, session, loading, role, roleLoaded, business, signOut, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}
