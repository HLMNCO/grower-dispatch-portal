import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ShortLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) { setError(true); return; }

    const resolve = async () => {
      const { data, error: err } = await supabase
        .from('supplier_intake_links')
        .select('intake_token, grower_name, grower_code, grower_email, grower_phone')
        .eq('short_code', code)
        .single();

      if (err || !data) { setError(true); return; }

      const params = new URLSearchParams();
      params.set('name', data.grower_name);
      if (data.grower_code) params.set('code', data.grower_code);
      if (data.grower_email) params.set('email', data.grower_email);
      if (data.grower_phone) params.set('phone', data.grower_phone);

      navigate(`/submit/${data.intake_token}?${params.toString()}`, { replace: true });
    };

    resolve();
  }, [code, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-display mb-2">Invalid Link</h1>
          <p className="text-muted-foreground text-sm">This link is not valid. Please contact your receiver for a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
