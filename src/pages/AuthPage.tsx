import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Package, Truck } from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'supplier' | 'staff'>('supplier');

  // Business info
  const [businessName, setBusinessName] = useState('');
  const [abn, setAbn] = useState('');
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
    if (!businessName.trim()) {
      toast({ title: 'Business name required', variant: 'destructive' });
      return;
    }
    setLoading(true);

    // 1. Create user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName, role: role === 'supplier' ? 'supplier' : 'staff' },
      },
    });

    if (authError || !authData.user) {
      toast({ title: 'Sign up failed', description: authError?.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // 2. Create business
    const { data: business, error: bizError } = await supabase.from('businesses').insert({
      owner_id: authData.user.id,
      name: businessName,
      business_type: role === 'supplier' ? 'supplier' : 'receiver',
      abn: abn || null,
      city: city || null,
      state: state || null,
      phone: phone || null,
      email: signupEmail,
      grower_code: role === 'supplier' ? (growerCode || null) : null,
      region: role === 'supplier' ? (region || null) : null,
    }).select('id').single();

    if (bizError) {
      toast({ title: 'Business setup failed', description: bizError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // 3. Update profile with business_id
    if (business) {
      await supabase.from('profiles').update({
        business_id: business.id,
        company_name: businessName,
        display_name: displayName,
        grower_code: role === 'supplier' ? (growerCode || null) : null,
        phone: phone || null,
      }).eq('user_id', authData.user.id);
    }

    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="p-2.5 rounded-xl bg-primary">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-display tracking-tight">FRESHDOCK</h1>
          </div>
          <p className="text-muted-foreground text-sm">Inbound dispatch management for fresh produce</p>
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
                <Button type="submit" className="w-full font-display tracking-wide" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-5">
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRole('staff')}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${role === 'staff' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'}`}>
                      <Package className="h-4 w-4 mb-1 text-primary" />
                      <div className="font-medium">Receiver / Agent</div>
                      <div className="text-xs text-muted-foreground">Wholesale, receive & distribute</div>
                    </button>
                    <button type="button" onClick={() => setRole('supplier')}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${role === 'supplier' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'}`}>
                      <Truck className="h-4 w-4 mb-1 text-primary" />
                      <div className="font-medium">Supplier / Grower</div>
                      <div className="text-xs text-muted-foreground">Grow & dispatch produce</div>
                    </button>
                  </div>
                </div>

                {/* Personal */}
                <div className="space-y-2">
                  <Label>Your Name *</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="e.g. John Smith" />
                </div>

                {/* Business Info */}
                <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                  <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                    {role === 'staff' ? 'Business Details' : 'Farm / Business Details'}
                  </h3>
                  <div className="space-y-2">
                    <Label>{role === 'staff' ? 'Business Name *' : 'Farm / Business Name *'}</Label>
                    <Input value={businessName} onChange={e => setBusinessName(e.target.value)} required
                      placeholder={role === 'staff' ? 'e.g. Metro Fresh Wholesale' : 'e.g. Valley Fresh Farms'} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>ABN</Label>
                      <Input value={abn} onChange={e => setAbn(e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Sydney" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input value={state} onChange={e => setState(e.target.value)} placeholder="e.g. NSW" />
                    </div>
                  </div>

                  {role === 'supplier' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Grower Code</Label>
                        <Input value={growerCode} onChange={e => setGrowerCode(e.target.value)} placeholder="e.g. VFF-042" />
                      </div>
                      <div className="space-y-2">
                        <Label>Region</Label>
                        <Input value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. Riverina" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Credentials */}
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

                <Button type="submit" className="w-full font-display tracking-wide" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
