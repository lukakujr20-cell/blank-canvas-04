import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { ALL_PERMISSIONS, PermissionKey } from '@/hooks/usePermissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Utensils, ChefHat, ClipboardList, Package, LayoutDashboard, Loader2 } from 'lucide-react';

interface UserPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: string;
}

const PERMISSION_ICONS: Record<PermissionKey, React.ElementType> = {
  dining_room: Utensils,
  kitchen: ChefHat,
  stock_entry: ClipboardList,
  inventory_management: Package,
  dashboard: LayoutDashboard,
};

export default function UserPermissionsModal({
  open,
  onOpenChange,
  userId,
  userName,
  userRole,
}: UserPermissionsModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perms, setPerms] = useState<Record<PermissionKey, boolean>>({
    dining_room: true,
    kitchen: false,
    stock_entry: true,
    inventory_management: false,
    dashboard: true,
  });

  useEffect(() => {
    if (open && userId) {
      fetchCurrentPermissions();
    }
  }, [open, userId]);

  const fetchCurrentPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('user_permissions') as any)
        .select('permission, granted')
        .eq('user_id', userId);

      if (error) throw error;

      // Start with role defaults
      const defaults = getRoleDefaults();
      const result = { ...defaults };
      (data || []).forEach((row: any) => {
        if (ALL_PERMISSIONS.includes(row.permission)) {
          result[row.permission as PermissionKey] = row.granted;
        }
      });
      setPerms(result);
    } catch (err) {
      console.error('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDefaults = (): Record<PermissionKey, boolean> => {
    if (userRole === 'cozinha') {
      return { dining_room: false, kitchen: true, stock_entry: true, inventory_management: false, dashboard: false };
    }
    if (userRole === 'staff') {
      return { dining_room: true, kitchen: false, stock_entry: true, inventory_management: false, dashboard: true };
    }
    return { dining_room: true, kitchen: true, stock_entry: true, inventory_management: true, dashboard: true };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert each permission
      for (const perm of ALL_PERMISSIONS) {
        const { error } = await (supabase
          .from('user_permissions') as any)
          .upsert(
            { user_id: userId, permission: perm, granted: perms[perm], updated_at: new Date().toISOString() },
            { onConflict: 'user_id,permission' }
          );
        if (error) throw error;
      }

      toast({ title: t('permissions.saved') });
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving permissions:', err);
      toast({ title: t('permissions.save_error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('permissions.title')}</DialogTitle>
          <DialogDescription>
            {t('permissions.description').replace('{name}', userName)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {ALL_PERMISSIONS.map((perm) => {
              const Icon = PERMISSION_ICONS[perm];
              return (
                <div key={perm} className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox
                    id={`perm-${perm}`}
                    checked={perms[perm]}
                    onCheckedChange={(checked) =>
                      setPerms({ ...perms, [perm]: !!checked })
                    }
                  />
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <Label htmlFor={`perm-${perm}`} className="text-sm font-medium cursor-pointer">
                      {t(`permissions.${perm}`)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(`permissions.${perm}_desc`)}
                    </p>
                  </div>
                </div>
              );
            })}

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
