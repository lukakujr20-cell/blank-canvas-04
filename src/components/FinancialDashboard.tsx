import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSession } from '@/hooks/useSession';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, Banknote, CreditCard, Wallet } from 'lucide-react';

interface FinancialStats {
  grossRevenue: number;
  totalOrders: number;
  avgTicket: number;
  byPaymentMethod: Record<string, { count: number; total: number }>;
}

export default function FinancialDashboard() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { currentSession } = useSession();
  const [stats, setStats] = useState<FinancialStats>({
    grossRevenue: 0,
    totalOrders: 0,
    avgTicket: 0,
    byPaymentMethod: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancials();
  }, [currentSession?.id]);

  const fetchFinancials = async () => {
    try {
      // Get closed orders from current session (or today if no session)
      let query = supabase
        .from('orders')
        .select('id, total, payment_method, closed_at')
        .eq('status', 'closed');

      if (currentSession?.id) {
        query = query.eq('session_id', currentSession.id);
      } else {
        // Fallback: today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('closed_at', today.toISOString());
      }

      const { data: orders } = await query;

      if (!orders || orders.length === 0) {
        setStats({ grossRevenue: 0, totalOrders: 0, avgTicket: 0, byPaymentMethod: {} });
        setLoading(false);
        return;
      }

      const grossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrders = orders.length;
      const avgTicket = totalOrders > 0 ? grossRevenue / totalOrders : 0;

      const byPaymentMethod: Record<string, { count: number; total: number }> = {};
      orders.forEach((o) => {
        const method = o.payment_method || 'unknown';
        if (!byPaymentMethod[method]) {
          byPaymentMethod[method] = { count: 0, total: 0 };
        }
        byPaymentMethod[method].count++;
        byPaymentMethod[method].total += o.total || 0;
      });

      setStats({ grossRevenue, totalOrders, avgTicket, byPaymentMethod });
    } catch (error) {
      console.error('Error fetching financials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return Banknote;
      case 'card': return CreditCard;
      case 'other': return Wallet;
      default: return DollarSign;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return t('billing.cash');
      case 'card': return t('billing.card');
      case 'other': return t('billing.other');
      default: return t('billing.other');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('finance.title')}</h2>
      
      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('finance.gross_revenue')}
            </CardTitle>
            <div className="rounded-lg p-2 bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.grossRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('finance.total_orders')}
            </CardTitle>
            <div className="rounded-lg p-2 bg-secondary">
              <ShoppingCart className="h-4 w-4 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('finance.avg_ticket')}
            </CardTitle>
            <div className="rounded-lg p-2 bg-accent">
              <TrendingUp className="h-4 w-4 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.avgTicket)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      {Object.keys(stats.byPaymentMethod).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t('finance.by_payment_method')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byPaymentMethod).map(([method, data]) => {
                const Icon = getPaymentMethodIcon(method);
                const percentage = stats.grossRevenue > 0 ? (data.total / stats.grossRevenue) * 100 : 0;
                return (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{getPaymentMethodLabel(method)}</span>
                      <span className="text-xs text-muted-foreground">({data.count})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{formatCurrency(data.total)}</span>
                      <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.totalOrders === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('finance.no_sales_yet')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
