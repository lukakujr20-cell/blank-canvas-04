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

interface UserToEdit {
  user_id: string;
  full_name: string;
  email: string;
  whatsapp?: string;
  role: string;
}

interface EditClientUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserToEdit | null;
  onSuccess: () => void;
}

export default function EditClientUserModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditClientUserModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    whatsapp: '',
    role: 'staff',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        password: '',
        whatsapp: user.whatsapp || '',
        role: user.role || 'staff',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          user_id: user.user_id,
          full_name: formData.full_name,
          email: formData.email !== user.email ? formData.email : undefined,
          password: formData.password || undefined,
          whatsapp: formData.whatsapp,
          role: formData.role !== user.role ? formData.role : undefined,
        },
      });

      if (error) throw new Error(error.message || 'Failed to update user');

      if (data?.error) {
        if (data.error === 'email_exists') {
          toast({ title: t('users.email_exists'), variant: 'destructive' });
          return;
        }
        if (data.error === 'permission_denied') {
          toast({ title: t('users.permission_denied'), variant: 'destructive' });
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
            <Label htmlFor="editClientName">{t('users.full_name')}</Label>
            <Input
              id="editClientName"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editClientEmail">{t('auth.email')}</Label>
            <Input
              id="editClientEmail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editClientPassword">{t('users.new_password')}</Label>
            <Input
              id="editClientPassword"
              type="password"
              placeholder={t('users.password_leave_empty')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editClientWhatsapp">{t('profile.whatsapp')}</Label>
            <Input
              id="editClientWhatsapp"
              type="tel"
              placeholder="+5511999999999"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('users.user_type')}</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="host">{t('users.host_desc')}</SelectItem>
                <SelectItem value="admin">{t('users.admin_desc')}</SelectItem>
                <SelectItem value="staff">{t('users.staff_desc')}</SelectItem>
                <SelectItem value="cozinha">{t('users.kitchen_desc') || 'Cozinha'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
