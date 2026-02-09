import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ActiveOrdersSection from '@/components/ActiveOrdersSection';
import FinishedOrdersSection from '@/components/FinishedOrdersSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface StockStats {
  totalItems: number;
  lowStock: number;
  expiringSoon: number;
  expired: number;
  upToDate: number;
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StockStats>({
    totalItems: 0,
    lowStock: 0,
    expiringSoon: 0,
    expired: 0,
    upToDate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: items, error } = await supabase
          .from('items')
          .select('*');

        if (error) throw error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let lowStock = 0;
        let expiringSoon = 0;
        let expired = 0;

        items?.forEach((item) => {
          if (item.current_stock < item.min_stock) {
            lowStock++;
          }
          if (item.expiry_date) {
            const expiryDate = parseISO(item.expiry_date);
            expiryDate.setHours(0, 0, 0, 0);
            const daysUntilExpiry = differenceInDays(expiryDate, today);
            if (daysUntilExpiry < 0) {
              expired++;
            } else if (daysUntilExpiry >= 0 && daysUntilExpiry <= 3) {
              expiringSoon++;
            }
          }
        });

        setStats({
          totalItems: items?.length || 0,
          lowStock,
          expiringSoon,
          expired,
          upToDate: (items?.length || 0) - lowStock - expiringSoon - expired,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleCardClick = (filter?: string, route?: string) => {
    if (route) {
      navigate(route);
    } else if (filter) {
      navigate(`/stock-entry?filter=${filter}`);
    }
  };

  const statCards = [
    {
      titleKey: 'dashboard.total_items',
      value: stats.totalItems,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      clickable: false,
    },
    {
      titleKey: 'dashboard.low_stock',
      value: stats.lowStock,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      clickable: true,
      route: '/shopping-list',
    },
    {
      titleKey: 'dashboard.expired_items',
      value: stats.expired,
      icon: XCircle,
      color: 'text-expired',
      bgColor: 'bg-expired/10',
      clickable: true,
      route: '/shopping-list',
    },
    {
      titleKey: 'dashboard.expiring_soon',
      value: stats.expiringSoon,
      icon: Clock,
      color: 'text-expiring',
      bgColor: 'bg-expiring/10',
      clickable: true,
      filter: 'expiring',
    },
    {
      titleKey: 'dashboard.up_to_date',
      value: stats.upToDate,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      clickable: false,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('dashboard.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <Card 
              key={stat.titleKey} 
              className={`animate-fade-in transition-all ${
                stat.clickable 
                  ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary/50' 
                  : ''
              }`}
              onClick={() => stat.clickable && handleCardClick(stat.filter, stat.route)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(stat.titleKey)}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? '...' : stat.value}
                </div>
                {stat.clickable && stat.value > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('dashboard.click_to_view')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders Sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ActiveOrdersSection />
          <FinishedOrdersSection />
        </div>

        {/* Quick Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quick_info')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t('dashboard.your_profile')}</p>
                <p className="text-sm text-muted-foreground">
                  {user?.email} • <span className="capitalize">{role}</span>
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium">{t('dashboard.color_legend')}</h3>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-expired-light border border-expired" />
                  <span className="text-sm">{t('dashboard.expired_legend')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-expiring-light border border-expiring" />
                  <span className="text-sm">{t('dashboard.expiring_legend')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-warning-light border border-warning" />
                  <span className="text-sm">{t('dashboard.low_stock_legend')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
