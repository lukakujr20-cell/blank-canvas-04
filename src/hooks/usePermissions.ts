import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const ALL_PERMISSIONS = [
  'dining_room',
  'kitchen',
  'stock_entry',
  'inventory_management',
  'dashboard',
] as const;

export type PermissionKey = typeof ALL_PERMISSIONS[number];

// Default permissions by role
const ROLE_DEFAULTS: Record<string, Record<PermissionKey, boolean>> = {
  host: {
    dining_room: true,
    kitchen: true,
    stock_entry: true,
    inventory_management: true,
    dashboard: true,
  },
  admin: {
    dining_room: true,
    kitchen: true,
    stock_entry: true,
    inventory_management: true,
    dashboard: true,
  },
  staff: {
    dining_room: true,
    kitchen: false,
    stock_entry: true,
    inventory_management: false,
    dashboard: true,
  },
  cozinha: {
    dining_room: false,
    kitchen: true,
    stock_entry: true,
    inventory_management: false,
    dashboard: false,
  },
};

export function usePermissions(targetUserId?: string) {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = targetUserId || user?.id;
  const effectiveRole = role || 'staff';

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchPermissions();
  }, [userId]);

  const fetchPermissions = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await (supabase
        .from('user_permissions') as any)
        .select('permission, granted')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching permissions:', error);
        // Fall back to role defaults
        setPermissions(getDefaults());
        setLoading(false);
        return;
      }

      const defaults = getDefaults();
      const overrides: Record<string, boolean> = {};
      (data || []).forEach((row: any) => {
        overrides[row.permission] = row.granted;
      });

      const merged = { ...defaults };
      for (const key of ALL_PERMISSIONS) {
        if (key in overrides) {
          merged[key] = overrides[key];
        }
      }
      setPermissions(merged);
    } catch {
      setPermissions(getDefaults());
    } finally {
      setLoading(false);
    }
  };

  const getDefaults = (): Record<PermissionKey, boolean> => {
    return ROLE_DEFAULTS[effectiveRole] || ROLE_DEFAULTS.staff;
  };

  const hasPermission = (perm: PermissionKey): boolean => {
    // Host and super_admin always have all permissions
    if (effectiveRole === 'host' || effectiveRole === 'super_admin') return true;
    if (!permissions) return getDefaults()[perm] ?? true;
    return permissions[perm] ?? true;
  };

  return { permissions, loading, hasPermission, refetch: fetchPermissions };
}
