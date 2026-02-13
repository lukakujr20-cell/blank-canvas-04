import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, User, Crown } from 'lucide-react';

type AppRole = 'super_admin' | 'host' | 'admin' | 'staff' | 'cozinha';

interface UserToEdit {
  id: string;
  email: string;
  full_name: string;
  whatsapp?: string;
  role: AppRole;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserToEdit | null;
  currentUserRole: AppRole | null;
  onSuccess: () => void;
}

export default function EditUserModal({
  open,
  onOpenChange,
  user,
  currentUserRole,
  onSuccess,
}: EditUserModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    whatsapp: '',
    role: 'staff' as AppRole,
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        whatsapp: user.whatsapp || '',
        role: user.role,
      });
    }
  }, [user]);

  // Determine which roles current user can assign
  const getAvailableRoles = (): AppRole[] => {
    if (currentUserRole === 'host') {
      return ['host', 'admin', 'staff', 'cozinha'];
    }
    if (currentUserRole === 'admin') {
      return ['staff', 'cozinha'];
    }
    return [];
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate hierarchy: Admin cannot edit Host
    if (currentUserRole === 'admin' && user.role === 'host') {
      toast({
        title: t('users.permission_denied'),
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      // Call edge function to update user
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email !== user.email ? formData.email : undefined,
          password: formData.password || undefined,
          whatsapp: formData.whatsapp,
          role: formData.role !== user.role ? formData.role : undefined,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to update user');
      }

      if (data?.error) {
        if (data.error === 'permission_denied') {
          toast({
            title: t('users.permission_denied'),
            variant: 'destructive',
          });
          return;
        }
        if (data.error === 'email_exists') {
          toast({
            title: t('users.email_exists'),
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.message || data.error);
      }

      toast({ title: t('users.updated_success') });
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      const message = error instanceof Error ? error.message : '';
      toast({
        title: t('users.update_error'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const availableRoles = getAvailableRoles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.edit_user')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('users.edit_user')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="editFullName">{t('users.full_name')}</Label>
            <Input
              id="editFullName"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editEmail">{t('auth.email')}</Label>
            <Input
              id="editEmail"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editPassword">{t('users.new_password')}</Label>
            <Input
              id="editPassword"
              type="password"
              placeholder={t('users.password_leave_empty')}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editWhatsapp">{t('profile.whatsapp')}</Label>
            <Input
              id="editWhatsapp"
              type="tel"
              placeholder="+5511999999999"
              value={formData.whatsapp}
              onChange={(e) =>
                setFormData({ ...formData, whatsapp: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">{t('profile.whatsapp_hint')}</p>
          </div>
          {availableRoles.length > 0 && (
            <div className="space-y-2">
              <Label>{t('users.user_type')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value: AppRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={availableRoles.length === 0}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentUserRole === 'host' && (
                    <SelectItem value="host">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-host" />
                        {t('users.host_desc')}
                      </div>
                    </SelectItem>
                  )}
                  {(currentUserRole === 'host' || currentUserRole === 'admin') && (
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {t('users.admin_desc')}
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('users.staff_desc')}
                    </div>
                  </SelectItem>
                  <SelectItem value="cozinha">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('users.cozinha_desc')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
