import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { LogoutConfirmDialog } from '@/components/LogoutConfirmDialog';
import Sidebar from './Sidebar';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function DashboardLayout({ children, requireAdmin = false }: DashboardLayoutProps) {
  const { user, loading, isAdmin, isKitchen, signOut } = useAuth();
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
    // Redirect kitchen users to kitchen panel if they try to access other pages
    if (!loading && isKitchen && location.pathname !== '/kitchen') {
      navigate('/kitchen');
    }
  }, [user, loading, isAdmin, isKitchen, requireAdmin, navigate, location.pathname]);

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
