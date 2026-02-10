import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EditUserModal from '@/components/EditUserModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Users as UsersIcon, Trash2, Shield, User, Crown, Pencil, ChefHat } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';

type AppRole = 'super_admin' | 'host' | 'admin' | 'staff' | 'cozinha';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: AppRole;
  full_name: string;
  whatsapp?: string;
}

export default function Users() {
  const { user, role: currentUserRole, isHost } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithRole | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'staff' as AppRole,
  });

  const getDateLocale = () => {
    switch (language) {
      case 'es': return es;
      case 'en': return enUS;
      default: return ptBR;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // RLS on profiles already filters by restaurant_id,
      // so we only see profiles from our own restaurant (or all if super_admin)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const profileIds = (profiles as any[] || []).map((p: any) => p.id);

      if (profileIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: roles, error: rolesError } = await (supabase
        .from('user_roles') as any)
        .select('user_id, role')
        .in('user_id', profileIds);

      if (rolesError) throw rolesError;

      const usersData: UserWithRole[] = (roles || [])
        .filter((role: any) => role.role !== 'super_admin') // Never show super_admin in this list
        .map((role: any) => {
          const profile = (profiles as any[])?.find((p: any) => p.id === role.user_id);
          return {
            id: role.user_id,
            email: profile?.email || 'Sem email',
            created_at: profile?.created_at || new Date().toISOString(),
            role: role.role as AppRole,
            full_name: profile?.full_name || 'Sem nome',
            whatsapp: profile?.whatsapp || undefined,
          };
        });

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: t('users.load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get available roles based on current user's role
  const getAvailableRolesForCreation = (): AppRole[] => {
    if (currentUserRole === 'host') {
      return ['host', 'admin', 'staff', 'cozinha'];
    }
    if (currentUserRole === 'admin') {
      return ['staff', 'cozinha'];
    }
    return [];
  };

  // Check if current user can manage target user
  const canManageUser = (targetRole: AppRole, targetId: string): boolean => {
    if (targetId === user?.id) return false; // Can't manage yourself
    if (currentUserRole === 'host') return true; // Host can manage everyone
    if (currentUserRole === 'admin' && targetRole === 'staff') return true; // Admin can manage staff
    return false;
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({
        title: t('users.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }

    if (newUser.password.length < 6) {
      toast({
        title: t('users.password_min'),
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
        },
      });

      // supabase.functions.invoke puts non-2xx body in data when error exists
      const result = data ?? (error as any)?.context?.body;

      if (error) {
        // Try to parse the error body for known errors
        try {
          const parsed = typeof error.message === 'string' && error.message.includes('{')
            ? JSON.parse(error.message.substring(error.message.indexOf('{')))
            : null;
          if (parsed?.error === 'email_exists') {
            toast({
              title: 'Este email já está cadastrado no sistema. Cada email só pode ser utilizado uma vez.',
              variant: 'destructive',
            });
            return;
          }
          if (parsed?.error === 'permission_denied') {
            toast({ title: t('users.permission_denied'), variant: 'destructive' });
            return;
          }
        } catch { /* not JSON, continue */ }

        // Check if data was returned alongside the error
        if (data?.error === 'email_exists') {
          toast({
            title: 'Este email já está cadastrado no sistema. Cada email só pode ser utilizado uma vez.',
            variant: 'destructive',
          });
          return;
        }
        if (data?.error === 'permission_denied') {
          toast({ title: t('users.permission_denied'), variant: 'destructive' });
          return;
        }

        throw new Error(data?.message || error.message || 'Failed to create user');
      }

      if (data?.error) {
        if (data.error === 'email_exists') {
          toast({
            title: 'Este email já está cadastrado no sistema. Cada email só pode ser utilizado uma vez.',
            variant: 'destructive',
          });
          return;
        }
        if (data.error === 'permission_denied') {
          toast({ title: t('users.permission_denied'), variant: 'destructive' });
          return;
        }
        throw new Error(data.message || data.error);
      }

      toast({ title: t('users.created_success') });
      setNewUser({ email: '', password: '', full_name: '', role: 'staff' });
      setModalOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const message = error instanceof Error ? error.message : '';
      toast({
        title: t('users.create_error'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, targetRole: AppRole) => {
    if (userId === user?.id) {
      toast({
        title: t('users.delete_self_error'),
        variant: 'destructive',
      });
      return;
    }

    if (!canManageUser(targetRole, userId)) {
      toast({
        title: t('users.permission_denied'),
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(t('users.confirm_delete'))) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete user');
      }

      if (data?.error) {
        if (data.error === 'permission_denied') {
          toast({
            title: t('users.permission_denied'),
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.message || data.error);
      }

      toast({ title: t('users.deleted') });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: t('users.delete_error'),
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (userToEdit: UserWithRole) => {
    setUserToEdit(userToEdit);
    setEditModalOpen(true);
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'host':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'host':
        return <Crown className="mr-1 h-3 w-3" />;
      case 'admin':
        return <Shield className="mr-1 h-3 w-3" />;
      case 'cozinha':
        return <ChefHat className="mr-1 h-3 w-3" />;
      default:
        return <User className="mr-1 h-3 w-3" />;
    }
  };

  const availableRoles = getAvailableRolesForCreation();

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{t('users.title')}</h1>
            <p className="mt-1 text-muted-foreground">
              {t('users.subtitle')}
            </p>
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('users.new_user')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('users.add_user')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('users.full_name')}</Label>
                  <Input
                    id="fullName"
                    placeholder="João da Silva"
                    value={newUser.full_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, full_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@email.com"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('users.user_type')}</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: AppRole) =>
                      setNewUser({ ...newUser, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t('users.staff_desc')}
                        </div>
                      </SelectItem>
                      {availableRoles.includes('cozinha') && (
                        <SelectItem value="cozinha">
                          <div className="flex items-center gap-2">
                            <ChefHat className="h-4 w-4" />
                            {t('users.cozinha_desc')}
                          </div>
                        </SelectItem>
                      )}
                      {availableRoles.includes('admin') && (
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {t('users.admin_desc')}
                          </div>
                        </SelectItem>
                      )}
                      {availableRoles.includes('host') && (
                        <SelectItem value="host">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-host" />
                            {t('users.host_desc')}
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateUser}
                  disabled={creating}
                >
                  {creating ? t('users.creating') : t('users.create_user')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">{t('users.no_users')}</h3>
              <p className="mt-2 text-center text-muted-foreground">
                {t('users.add_users_desc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header">
                      <TableHead className="font-semibold">{t('table.name')}</TableHead>
                      <TableHead className="font-semibold">{t('table.type')}</TableHead>
                      <TableHead className="font-semibold">{t('users.registered_at')}</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u, index) => {
                      const canManage = canManageUser(u.role, u.id);
                      const isHostUser = u.role === 'host';
                      
                      return (
                        <TableRow
                          key={u.id}
                          className={index % 2 === 1 ? 'bg-table-row-alt' : ''}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium uppercase ${
                                isHostUser 
                                  ? 'bg-host-light text-host ring-2 ring-host/50' 
                                  : 'bg-primary/10 text-primary'
                              }`}>
                                {u.full_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{u.full_name}</p>
                                {u.id === user?.id && (
                                  <span className="text-xs text-muted-foreground">{t('users.you')}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getRoleBadgeVariant(u.role)}
                              className={isHostUser ? 'bg-host-light text-host-foreground border-host/50 hover:bg-host-light' : ''}
                            >
                              {getRoleIcon(u.role)}
                              {t(`common.${u.role}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(parseISO(u.created_at), "dd 'de' MMMM 'de' yyyy", {
                              locale: getDateLocale(),
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {canManage && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditClick(u)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteUser(u.id, u.role)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={userToEdit}
        currentUserRole={currentUserRole}
        onSuccess={fetchUsers}
      />
    </DashboardLayout>
  );
}
