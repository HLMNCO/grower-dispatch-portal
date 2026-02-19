import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Sprout, Package, Clock } from 'lucide-react';

/** Seedling mark for auth page */
function AuthSeedling() {
  return (
    <svg width="52" height="58" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 100 L50 45" stroke="rgba(42,107,58,0.45)" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M50 70 C50 70 30 65 22 50 C20 46 21 40 25 38 C30 36 38 40 44 50 C48 57 50 65 50 70Z"
        fill="#3a8c4e"
      />
      <path
        d="M50 58 C50 58 68 50 78 36 C81 31 80 25 76 23 C71 21 63 26 57 36 C53 43 50 52 50 58Z"
        fill="#f5c842"
      />
      <ellipse cx="50" cy="102" rx="14" ry="3.5" fill="rgba(92,61,30,0.1)" />
      <circle cx="50" cy="42" r="4" fill="#e0a820" />
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [requestSent, setRequestSent] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'supplier' | 'staff'>('supplier');

  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [growerCode, setGrowerCode] = useState('');
  const [region, setRegion] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (role === 'supplier' && !businessName.trim()) {
      toast({ title: 'Business name required', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName, role: role === 'staff' ? 'staff' : 'supplier' },
      },
    });

    if (authError || !authData.user) {
      toast({ title: 'Sign up failed', description: authError?.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (role === 'supplier') {
      const { data: business, error: bizError } = await supabase.from('businesses').insert({
        owner_id: authData.user.id,
        name: businessName,
        business_type: 'supplier',
        city: city || null,
        state: state || null,
        phone: phone || null,
        email: signupEmail,
        grower_code: growerCode || null,
        region: region || null,
      }).select('id').single();

      if (bizError) {
        toast({ title: 'Business setup failed', description: bizError.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (business) {
        await supabase.from('profiles').update({
          business_id: business.id,
          company_name: businessName,
          display_name: displayName,
          grower_code: growerCode || null,
          phone: phone || null,
        }).eq('user_id', authData.user.id);
      }

      const { error: reqError } = await supabase.from('staff_requests').insert({
        user_id: authData.user.id,
        display_name: displayName,
        email: signupEmail,
        requested_role: 'supplier',
      });

      if (reqError) {
        toast({ title: 'Request failed', description: reqError.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      setLoading(false);
      setRequestSent(true);
    } else {
      const { error: reqError } = await supabase.from('staff_requests').insert({
        user_id: authData.user.id,
        display_name: displayName,
        email: signupEmail,
        requested_role: 'staff',
      });

      if (reqError) {
        toast({ title: 'Request failed', description: reqError.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      setLoading(false);
      setRequestSent(true);
    }
  };

  if (requestSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold tracking-tight">Request Submitted</h2>
            <p className="text-sm text-muted-foreground">
              Your request to join has been sent. An admin will review and approve your access shortly.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">You'll be able to sign in once approved.</p>
          <Button variant="outline" onClick={() => { setRequestSent(false); setTab('login'); }}>
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">

        {/* Logo lockup */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <AuthSeedling />
          </div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-display font-black text-3xl tracking-tight text-foreground">Pack</span>
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">to</span>
            <span className="font-display font-black text-3xl tracking-tight" style={{ color: '#e0a820' }}>Produce</span>
          </div>
          <p className="text-muted-foreground text-sm">Dispatch management for fresh produce growers</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full font-display font-bold tracking-wide" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-5">
                {/* Role selection */}
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setRole('supplier')}
                      className={`p-4 rounded-lg border text-left text-sm transition-all ${role === 'supplier' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'}`}>
                      <Sprout className="h-5 w-5 mb-1.5 text-primary" />
                      <div className="font-display font-bold">Grower</div>
                      <div className="text-xs text-muted-foreground">I send produce</div>
                    </button>
                    <button type="button" onClick={() => setRole('staff')}
                      className={`p-4 rounded-lg border text-left text-sm transition-all ${role === 'staff' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'}`}>
                      <Package className="h-5 w-5 mb-1.5 text-primary" />
                      <div className="font-display font-bold">Receiver Staff</div>
                      <div className="text-xs text-muted-foreground">I work receiving</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Your Name *</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="e.g. John Smith" />
                </div>

                {role === 'supplier' && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                    <h3 className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground">Farm / Business Details</h3>
                    <div className="space-y-2">
                      <Label>Farm / Business Name *</Label>
                      <Input value={businessName} onChange={e => setBusinessName(e.target.value)} required
                        placeholder="e.g. Valley Fresh Farms" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
                      </div>
                      <div className="space-y-2">
                        <Label>Grower Code</Label>
                        <Input value={growerCode} onChange={e => setGrowerCode(e.target.value)} placeholder="e.g. VFF-042" />
                      </div>
                      <div className="space-y-2">
                        <Label>Region</Label>
                        <Input value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. Riverina" />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={state} onChange={e => setState(e.target.value)} placeholder="e.g. NSW" />
                      </div>
                    </div>
                  </div>
                )}

                {role === 'staff' && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Your request will be sent to an admin for approval. You'll be able to sign in once approved.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>

                <Button type="submit" className="w-full font-display font-bold tracking-wide" disabled={loading}>
                  {loading ? 'Creating account...' : role === 'staff' ? 'Request Access' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
