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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Users as UsersIcon, Trash2, Shield, User, Crown, Pencil, ChefHat, Settings2, ChevronDown, Store } from 'lucide-react';
import UserPermissionsModal from '@/components/UserPermissionsModal';
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
  restaurant_id?: string | null;
}

interface RestaurantGroup {
  id: string;
  name: string;
  users: UserWithRole[];
}

export default function Users() {
  const { user, role: currentUserRole, isHost, isSuperAdmin } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithRole | null>(null);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [userForPermissions, setUserForPermissions] = useState<UserWithRole | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'staff' as AppRole,
    restaurant_id: '',
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
        .filter((role: any) => role.role !== 'super_admin')
        .map((role: any) => {
          const profile = (profiles as any[])?.find((p: any) => p.id === role.user_id);
          return {
            id: role.user_id,
            email: profile?.email || 'Sem email',
            created_at: profile?.created_at || new Date().toISOString(),
            role: role.role as AppRole,
            full_name: profile?.full_name || 'Sem nome',
            whatsapp: profile?.whatsapp || undefined,
            restaurant_id: profile?.restaurant_id || null,
          };
        });

      setUsers(usersData);

      // For super_admin, fetch all restaurants
      if (isSuperAdmin) {
        const { data: restaurantsData, error: restError } = await supabase
          .from('restaurants')
          .select('id, name')
          .order('name');
        
        if (!restError && restaurantsData) {
          setRestaurants(restaurantsData);
          // Open all sections by default
          const openState: Record<string, boolean> = {};
          restaurantsData.forEach((r: any) => { openState[r.id] = true; });
          openState['no_restaurant'] = true;
          setOpenSections(openState);
        }
      }
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

  const getAvailableRolesForCreation = (): AppRole[] => {
    if (currentUserRole === 'super_admin') {
      return ['host', 'admin', 'staff', 'cozinha'];
    }
    if (currentUserRole === 'host') {
      return ['host', 'admin', 'staff', 'cozinha'];
    }
    if (currentUserRole === 'admin') {
      return ['staff', 'cozinha'];
    }
    return [];
  };

  const canManageUser = (targetRole: AppRole, targetId: string): boolean => {
    if (targetId === user?.id) return false;
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'host') return true;
    if (currentUserRole === 'admin' && targetRole === 'staff') return true;
    return false;
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({ title: t('users.fill_all_fields'), variant: 'destructive' });
      return;
    }

    if (newUser.password.length < 6) {
      toast({ title: t('users.password_min'), variant: 'destructive' });
      return;
    }

    if (isSuperAdmin && !newUser.restaurant_id) {
      toast({ title: t('users.select_restaurant'), variant: 'destructive' });
      return;
    }

    setCreating(true);

    try {
      const body: any = {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
      };

      if (isSuperAdmin && newUser.restaurant_id) {
        body.restaurant_id = newUser.restaurant_id;
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body,
      });

      if (error) {
        const errMsg = error.message || '';
        if (errMsg.includes('email_exists') || data?.error === 'email_exists') {
          toast({
            title: 'Este email já está cadastrado no sistema. Cada email só pode ser utilizado uma vez.',
            variant: 'destructive',
          });
          setCreating(false);
          return;
        }
        if (errMsg.includes('permission_denied') || data?.error === 'permission_denied') {
          toast({ title: t('users.permission_denied'), variant: 'destructive' });
          setCreating(false);
          return;
        }
        toast({ title: t('users.create_error'), description: data?.message || errMsg, variant: 'destructive' });
        setCreating(false);
        return;
      }

      if (data?.error) {
        if (data.error === 'email_exists') {
          toast({
            title: 'Este email já está cadastrado no sistema. Cada email só pode ser utilizado uma vez.',
            variant: 'destructive',
          });
          setCreating(false);
          return;
        }
        if (data.error === 'permission_denied') {
          toast({ title: t('users.permission_denied'), variant: 'destructive' });
          setCreating(false);
          return;
        }
        toast({ title: t('users.create_error'), description: data.message || data.error, variant: 'destructive' });
        setCreating(false);
        return;
      }

      toast({ title: t('users.created_success') });
      setNewUser({ email: '', password: '', full_name: '', role: 'staff', restaurant_id: '' });
      setModalOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('email_exists')) {
        toast({
          title: 'Este email já está cadastrado no sistema. Cada email só pode ser utilizado uma vez.',
          variant: 'destructive',
        });
      } else {
        toast({ title: t('users.create_error'), description: message, variant: 'destructive' });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, targetRole: AppRole) => {
    if (userId === user?.id) {
      toast({ title: t('users.delete_self_error'), variant: 'destructive' });
      return;
    }

    if (!canManageUser(targetRole, userId)) {
      toast({ title: t('users.permission_denied'), variant: 'destructive' });
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
          toast({ title: t('users.permission_denied'), variant: 'destructive' });
          return;
        }
        throw new Error(data.message || data.error);
      }

      toast({ title: t('users.deleted') });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: t('users.delete_error'), variant: 'destructive' });
    }
  };

  const handleEditClick = (userToEdit: UserWithRole) => {
    setUserToEdit(userToEdit);
    setEditModalOpen(true);
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'host': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'host': return <Crown className="mr-1 h-3 w-3" />;
      case 'admin': return <Shield className="mr-1 h-3 w-3" />;
      case 'cozinha': return <ChefHat className="mr-1 h-3 w-3" />;
      default: return <User className="mr-1 h-3 w-3" />;
    }
  };

  const availableRoles = getAvailableRolesForCreation();

  // Group users by restaurant for super_admin
  const getRestaurantGroups = (): RestaurantGroup[] => {
    const groups: RestaurantGroup[] = [];
    
    restaurants.forEach((restaurant) => {
      const restaurantUsers = users.filter((u) => u.restaurant_id === restaurant.id);
      if (restaurantUsers.length > 0) {
        // Sort: hosts first, then by name
        restaurantUsers.sort((a, b) => {
          if (a.role === 'host' && b.role !== 'host') return -1;
          if (a.role !== 'host' && b.role === 'host') return 1;
          return a.full_name.localeCompare(b.full_name);
        });
        groups.push({ id: restaurant.id, name: restaurant.name, users: restaurantUsers });
      }
    });

    // Users without restaurant
    const orphans = users.filter((u) => !u.restaurant_id);
    if (orphans.length > 0) {
      groups.push({ id: 'no_restaurant', name: t('users.no_restaurant'), users: orphans });
    }

    return groups;
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderUserRow = (u: UserWithRole, index: number) => {
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
                {(currentUserRole === 'host' || currentUserRole === 'super_admin') && (u.role === 'staff' || u.role === 'cozinha' || u.role === 'admin') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('permissions.title')}
                    onClick={() => {
                      setUserForPermissions(u);
                      setPermissionsModalOpen(true);
                    }}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                )}
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
  };

  const renderUsersTable = (usersList: UserWithRole[]) => (
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
          {usersList.map((u, index) => renderUserRow(u, index))}
        </TableBody>
      </Table>
    </div>
  );

  const renderCreateDialog = () => (
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
          {/* Restaurant selector for super_admin */}
          {isSuperAdmin && restaurants.length > 0 && (
            <div className="space-y-2">
              <Label>{t('users.restaurant_section')}</Label>
              <Select
                value={newUser.restaurant_id}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, restaurant_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('users.select_restaurant')} />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {r.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
  );

  // Super Admin grouped view
  const renderSuperAdminView = () => {
    const groups = getRestaurantGroups();

    if (groups.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{t('users.no_users')}</h3>
            <p className="mt-2 text-center text-muted-foreground">
              {t('users.add_users_desc')}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <Collapsible
            key={group.id}
            open={openSections[group.id] ?? true}
            onOpenChange={() => toggleSection(group.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {group.users.length} {group.users.length === 1 ? t('users.user_count') : t('users.user_count_plural')}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSections[group.id] ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-0">
                  {renderUsersTable(group.users)}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    );
  };

  // Regular host/admin view (flat list)
  const renderRegularView = () => {
    if (users.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{t('users.no_users')}</h3>
            <p className="mt-2 text-center text-muted-foreground">
              {t('users.add_users_desc')}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {users.length} {users.length === 1 ? t('users.user_count') : t('users.user_count_plural')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {renderUsersTable(users)}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {isSuperAdmin ? t('users.all_restaurants') : t('users.title')}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {t('users.subtitle')}
            </p>
          </div>
          {renderCreateDialog()}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : isSuperAdmin ? (
          renderSuperAdminView()
        ) : (
          renderRegularView()
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

      {/* Permissions Modal */}
      {userForPermissions && (
        <UserPermissionsModal
          open={permissionsModalOpen}
          onOpenChange={setPermissionsModalOpen}
          userId={userForPermissions.id}
          userName={userForPermissions.full_name}
          userRole={userForPermissions.role}
        />
      )}
    </DashboardLayout>
  );
}
