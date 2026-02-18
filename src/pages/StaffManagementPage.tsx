import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { StaffPosition } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Users, Shield, Save, Loader2 } from 'lucide-react';

interface StaffMember {
  user_id: string;
  display_name: string;
  email: string;
  phone: string | null;
  position: StaffPosition | null;
}

const positionLabels: Record<StaffPosition, string> = {
  admin: 'Admin',
  warehouse_manager: 'Warehouse Manager',
  operations: 'Operations / Office',
  forklift_driver: 'Forklift Driver',
  dock_hand: 'Dock Hand',
};

const positionColors: Record<StaffPosition, string> = {
  admin: 'text-primary',
  warehouse_manager: 'text-blue-600',
  operations: 'text-violet-600',
  forklift_driver: 'text-amber-600',
  dock_hand: 'text-muted-foreground',
};

export default function StaffManagementPage() {
  const { user: currentUser, business } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPosition, setEditPosition] = useState<StaffPosition>('dock_hand');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business) fetchStaff();
  }, [business]);

  const fetchStaff = async () => {
    if (!business) return;
    // Get all profiles linked to this business
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, phone, company_name')
      .eq('business_id', business.id);

    if (!profiles) { setLoading(false); return; }

    // Get positions for all these users
    const userIds = profiles.map(p => p.user_id);
    const { data: positions } = await supabase
      .from('staff_positions')
      .select('user_id, position')
      .in('user_id', userIds);

    // Get emails from user_roles (we know they're staff)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds)
      .eq('role', 'staff');

    // Get staff request emails
    const { data: requests } = await supabase
      .from('staff_requests')
      .select('user_id, email')
      .in('user_id', userIds);

    const posMap = new Map(positions?.map(p => [p.user_id, p.position as StaffPosition]) || []);
    const emailMap = new Map(requests?.map(r => [r.user_id, r.email]) || []);
    const staffUserIds = new Set(roles?.map(r => r.user_id) || []);

    const members: StaffMember[] = profiles
      .filter(p => staffUserIds.has(p.user_id))
      .map(p => ({
        user_id: p.user_id,
        display_name: p.display_name || 'Unknown',
        email: emailMap.get(p.user_id) || '',
        phone: p.phone,
        position: posMap.get(p.user_id) || null,
      }));

    setStaff(members);
    setLoading(false);
  };

  const handleSavePosition = async (userId: string) => {
    setSaving(true);
    // Upsert position
    const { error } = await supabase
      .from('staff_positions')
      .upsert({ user_id: userId, position: editPosition }, { onConflict: 'user_id' });

    setSaving(false);
    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Position updated' });
      setEditingId(null);
      fetchStaff();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-lg sm:text-xl font-display tracking-tight">Staff</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{staff.length} team member{staff.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No staff members yet. They'll appear here once approved from the dashboard.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {staff.map(member => {
              const isEditing = editingId === member.user_id;
              const isSelf = member.user_id === currentUser?.id;

              return (
                <div key={member.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {member.position === 'admin'
                        ? <Shield className="h-3.5 w-3.5 text-primary" />
                        : <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.display_name}
                        {isSelf && <span className="text-xs text-muted-foreground ml-1.5">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                        {member.position && (
                          <span className={`ml-1.5 ${positionColors[member.position]}`}>
                            · {positionLabels[member.position]}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <Select value={editPosition} onValueChange={v => setEditPosition(v as StaffPosition)}>
                          <SelectTrigger className="h-8 w-[150px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(positionLabels).map(([val, label]) => (
                              <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 px-2" disabled={saving} onClick={() => handleSavePosition(member.user_id)}>
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 font-display text-xs"
                        onClick={() => { setEditingId(member.user_id); setEditPosition(member.position || 'dock_hand'); }}
                      >
                        Change Role
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
