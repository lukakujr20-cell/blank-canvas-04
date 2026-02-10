import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Package,
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
  ChevronLeft,
  Menu,
  Settings,
  FileText,
  ShoppingCart,
  UtensilsCrossed,
  Utensils,
  Globe,
  Building2,
  ChefHat,
  
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { LogoutConfirmDialog } from '@/components/LogoutConfirmDialog';

const navItems = [
  {
    titleKey: 'nav.clients',
    href: '/clients',
    icon: Building2,
    roles: ['super_admin'],
  },
  {
    titleKey: 'nav.kitchen',
    href: '/kitchen',
    icon: ChefHat,
    roles: ['cozinha'],
  },
  {
    titleKey: 'nav.inventory',
    href: '/inventory',
    icon: Package,
    roles: ['super_admin', 'host', 'admin', 'cozinha'],
  },
  {
    titleKey: 'nav.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'host', 'admin', 'staff'],
  },
  {
    titleKey: 'nav.dining_room',
    href: '/dining-room',
    icon: Utensils,
    roles: ['super_admin', 'host', 'admin', 'staff'],
  },
  
  {
    titleKey: 'nav.stock_entry',
    href: '/stock-entry',
    icon: ClipboardList,
    roles: ['super_admin', 'host', 'admin', 'staff'],
  },
  {
    titleKey: 'nav.shopping_list',
    href: '/shopping-list',
    icon: ShoppingCart,
    roles: ['super_admin', 'host', 'admin', 'staff'],
  },
  {
    titleKey: 'nav.dishes',
    href: '/dishes',
    icon: UtensilsCrossed,
    roles: ['super_admin', 'host', 'admin'],
  },
  {
    titleKey: 'nav.audit_history',
    href: '/audit-history',
    icon: FileText,
    roles: ['super_admin', 'host', 'admin'],
  },
  {
    titleKey: 'nav.users',
    href: '/users',
    icon: Users,
    roles: ['super_admin', 'host', 'admin'],
  },
  {
    titleKey: 'nav.settings',
    href: '/settings',
    icon: Settings,
    roles: ['super_admin', 'host', 'admin', 'staff'],
  },
];

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function Sidebar() {
  const { user, role, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(role || 'staff')
  );

  const handleMouseEnter = () => {
    if (!isMobile) {
      setCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setCollapsed(true);
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    await signOut();
    navigate('/auth');
  };

  const currentLang = languages.find((l) => l.code === language);

  const SidebarContent = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={cn(
      "flex h-full flex-col",
      inSheet && "pt-2"
    )}>
      {/* Logo - only show in desktop sidebar */}
      {!inSheet && (
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
              <Package className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold">EstoqueApp</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent md:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                collapsed && 'rotate-180'
              )}
            />
          </Button>
        </div>
      )}

      {/* Navigation - with scroll */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              onClick={handleNavClick}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(inSheet || !collapsed) && <span>{t(item.titleKey)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Quick Settings */}
      {(inSheet || !collapsed) && (
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
                  <Globe className="h-4 w-4" />
                  <span>{currentLang?.flag}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="z-[100]">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle variant="compact" />
          </div>
        </div>
      )}

      {/* User info - always at bottom */}
      <div className="border-t border-sidebar-border p-4">
        <div className={cn('flex items-center gap-3', !inSheet && collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium uppercase shrink-0">
            {user?.email?.charAt(0) || 'U'}
          </div>
          {(inSheet || !collapsed) && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/70 capitalize">
                {role || t('common.loading')}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          className={cn(
            'mt-3 w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            !inSheet && collapsed && 'px-0'
          )}
          onClick={handleLogoutClick}
        >
          <LogOut className="h-4 w-4" />
          {(inSheet || !collapsed) && <span className="ml-2">{t('nav.logout')}</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sheet Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground">
          <SheetHeader className="border-b border-sidebar-border p-4">
            <SheetTitle className="flex items-center gap-3 text-sidebar-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
                <Package className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <span>EstoqueApp</span>
            </SheetTitle>
          </SheetHeader>
          <SidebarContent inSheet />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'hidden md:flex sticky top-0 h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}