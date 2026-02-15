import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, ShoppingCart, TrendingUp, CalendarIcon, Filter } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClosedOrder {
  id: string;
  table_id: string | null;
  customer_name: string | null;
  total: number | null;
  payment_method: string | null;
  closed_at: string | null;
  waiter_id: string;
}

export default function Financeiro() {
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { isSuperAdmin } = useAuth();
  const [orders, setOrders] = useState<ClosedOrder[]>([]);
  const [tables, setTables] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const getLocale = () => {
    switch (language) {
      case 'pt-BR': return ptBR;
      case 'es': return es;
      default: return enUS;
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, paymentFilter, selectedRestaurant]);

  useEffect(() => {
    if (isSuperAdmin) {
      supabase.from('restaurants').select('id, name').then(({ data }) => {
        setRestaurants(data || []);
      });
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('id, table_id, customer_name, total, payment_method, closed_at, waiter_id, restaurant_id')
        .eq('status', 'closed')
        .gte('closed_at', startOfDay(dateFrom).toISOString())
        .lte('closed_at', endOfDay(dateTo).toISOString())
        .order('closed_at', { ascending: false });

      if (paymentFilter !== 'all') {
        query = query.eq('payment_method', paymentFilter);
      }

      if (isSuperAdmin && selectedRestaurant !== 'all') {
        query = query.eq('restaurant_id', selectedRestaurant);
      }

      const [ordersRes, tablesRes, profilesRes] = await Promise.all([
        query,
        supabase.from('restaurant_tables').select('id, table_number'),
        supabase.from('profiles').select('id, full_name'),
      ]);

      setOrders((ordersRes.data as any[]) || []);

      const tMap: Record<string, number> = {};
      (tablesRes.data || []).forEach((t: any) => { tMap[t.id] = t.table_number; });
      setTables(tMap);

      const pMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { pMap[p.id] = p.full_name || ''; });
      setProfiles(pMap);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const grossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? grossRevenue / totalOrders : 0;

  const getPaymentLabel = (method: string | null) => {
    switch (method) {
      case 'cash': return t('billing.cash');
      case 'card': return t('billing.card');
      case 'other': return t('billing.other');
      default: return t('billing.other');
    }
  };

  const getOrderLabel = (order: ClosedOrder) => {
    if (order.table_id && tables[order.table_id]) {
      return `${t('dining.table')} ${tables[order.table_id]}`;
    }
    return order.customer_name || 'Balcão';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('financeiro.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('financeiro.subtitle')}</p>
        </div>

        {/* Summary Cards */}
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
              <div className="text-2xl font-bold text-primary">{formatCurrency(grossRevenue)}</div>
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
              <div className="text-2xl font-bold">{totalOrders}</div>
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
              <div className="text-2xl font-bold">{formatCurrency(avgTicket)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Date From */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">{t('session.from')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateFrom, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(d) => d && setDateFrom(d)}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">{t('session.to')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateTo, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(d) => d && setDateTo(d)}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">{t('billing.payment_method')}</label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('audit.all_movements')}</SelectItem>
                    <SelectItem value="cash">{t('billing.cash')}</SelectItem>
                    <SelectItem value="card">{t('billing.card')}</SelectItem>
                    <SelectItem value="other">{t('billing.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Restaurant Filter (Super Admin only) */}
              {isSuperAdmin && restaurants.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">{t('users.restaurant_section')}</label>
                  <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('users.all_restaurants')}</SelectItem>
                      {restaurants.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('financeiro.orders_table')} ({totalOrders})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {t('finance.no_sales_yet')}
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('financeiro.col_date')}</TableHead>
                      <TableHead>{t('financeiro.col_origin')}</TableHead>
                      <TableHead>{t('dining.waiter')}</TableHead>
                      <TableHead>{t('billing.payment_method')}</TableHead>
                      <TableHead className="text-right">{t('orders.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm">
                          {order.closed_at
                            ? format(parseISO(order.closed_at), 'dd/MM HH:mm', { locale: getLocale() })
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{getOrderLabel(order)}</TableCell>
                        <TableCell>{profiles[order.waiter_id] || t('audit.unknown_user')}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getPaymentLabel(order.payment_method)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(order.total || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
