import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, PermissionKey } from '@/hooks/usePermissions';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { LogoutConfirmDialog } from '@/components/LogoutConfirmDialog';
import Sidebar from './Sidebar';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

// Map routes to permission keys
const ROUTE_PERMISSION_MAP: Record<string, PermissionKey> = {
  '/dining-room': 'dining_room',
  '/pos': 'dining_room',
  '/kitchen': 'kitchen',
  '/stock-entry': 'stock_entry',
  '/inventory': 'inventory_management',
  '/dashboard': 'dashboard',
  '/financeiro': 'dashboard',
};

export default function DashboardLayout({ children, requireAdmin = false }: DashboardLayoutProps) {
  const { user, loading, isAdmin, isKitchen, role, signOut } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutAttempt = useCallback(() => {
    setShowLogoutDialog(true);
  }, []);

  const handleConfirmLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Use the navigation guard to intercept back button to /auth
  useNavigationGuard({ onLogoutAttempt: handleLogoutAttempt });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && requireAdmin && !isAdmin) {
      navigate('/dashboard');
    }
    // Check granular permissions for routes
    if (!loading && !permLoading && user && role && role !== 'host' && role !== 'super_admin') {
      const requiredPerm = ROUTE_PERMISSION_MAP[location.pathname];
      if (requiredPerm && !hasPermission(requiredPerm)) {
        // Redirect to first available route or settings
        navigate('/settings');
      }
    }
  }, [user, loading, isAdmin, isKitchen, requireAdmin, navigate, location.pathname, permLoading, role]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requireAdmin && !isAdmin) return null;

  return (
    <>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 pt-16 md:pt-6">
            {children}
          </div>
        </main>
      </div>
      
      <LogoutConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
