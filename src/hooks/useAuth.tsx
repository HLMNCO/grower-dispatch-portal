import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type StaffPosition = 'admin' | 'warehouse_manager' | 'operations' | 'forklift_driver' | 'dock_hand';

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
  staffPosition: StaffPosition | null;
  isAdmin: boolean;
  canPlan: boolean;
  canReceive: boolean;
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
  staffPosition: null,
  isAdmin: false,
  canPlan: false,
  canReceive: false,
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
  const [staffPosition, setStaffPosition] = useState<StaffPosition | null>(null);

  const isAdmin = staffPosition === 'admin';
  const canPlan = ['admin', 'warehouse_manager', 'operations'].includes(staffPosition || '');
  const canReceive = role === 'staff'; // all staff can receive

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async (userId: string) => {
      try {
        await Promise.all([
          fetchRole(userId),
          fetchBusiness(userId),
          fetchStaffPosition(userId),
        ]);
      } catch (e) {
        console.error('Error loading user data:', e);
        if (isMounted) {
          setRoleLoaded(true);
          setLoading(false);
        }
      }
    };

    // Listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setRoleLoaded(false);
        setTimeout(() => loadUserData(session.user.id), 0);
      } else {
        setRole(null);
        setRoleLoaded(true);
        setBusiness(null);
        setStaffPosition(null);
        setLoading(false);
      }
    });

    // INITIAL load (controls loading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserData(session.user.id);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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

  const fetchStaffPosition = async (userId: string) => {
    const { data } = await supabase
      .from('staff_positions')
      .select('position')
      .eq('user_id', userId)
      .maybeSingle();
    setStaffPosition((data?.position as StaffPosition) ?? null);
  };

  const refreshBusiness = async () => {
    if (user) await fetchBusiness(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, roleLoaded, business, staffPosition, isAdmin, canPlan, canReceive, signOut, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}
