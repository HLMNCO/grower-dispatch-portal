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

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<'supplier' | 'staff'>('supplier');

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
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
          role: role,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Check your email',
        description: 'We\'ve sent you a confirmation link. Please verify your email to sign in.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Branding */}
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
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input id="loginEmail" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPass">Password</Label>
                  <Input id="loginPass" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full font-display tracking-wide" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Your Name</Label>
                  <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company / Farm Name</Label>
                  <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('supplier')}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        role === 'supplier' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <Truck className="h-4 w-4 mb-1 text-primary" />
                      <div className="font-medium">Supplier / Grower</div>
                      <div className="text-xs text-muted-foreground">Submit dispatches</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('staff')}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        role === 'staff' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <Package className="h-4 w-4 mb-1 text-primary" />
                      <div className="font-medium">Staff</div>
                      <div className="text-xs text-muted-foreground">Receive & manage</div>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <Input id="signupEmail" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPass">Password</Label>
                  <Input id="signupPass" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
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
