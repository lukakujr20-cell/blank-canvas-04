import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Store, UtensilsCrossed, CheckCircle2, History } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import OrderDetailModal from '@/components/OrderDetailModal';

interface Order {
  id: string;
  table_id: string | null;
  status: string;
  waiter_id: string;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  total: number | null;
  guest_count: number | null;
  customer_name: string | null;
}

interface RestaurantTable {
  id: string;
  table_number: number;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function FinishedOrdersSection() {
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const getLocale = () => {
    switch (language) {
      case 'pt-BR': return ptBR;
      case 'es': return es;
      default: return enUS;
    }
  };

  useEffect(() => {
    fetchData();

    // Set up realtime subscription
    const ordersChannel = supabase
      .channel('finished-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [ordersRes, tablesRes, profilesRes] = await Promise.all([
        (supabase
          .from('orders') as any)
          .select('*')
          .in('status', ['closed', 'paid'])
          .gte('closed_at', today.toISOString())
          .order('closed_at', { ascending: false })
          .limit(20),
        (supabase.from('restaurant_tables') as any).select('id, table_number'),
        supabase.from('profiles').select('id, full_name'),
      ]);

      setOrders(ordersRes.data || []);
      setTables(tablesRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Error fetching finished orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTableNumber = (tableId: string | null) => {
    if (!tableId) return null;
    return tables.find(t => t.id === tableId)?.table_number;
  };

  const getWaiterName = (waiterId: string) => {
    return profiles.find(p => p.id === waiterId)?.full_name || t('audit.unknown_user');
  };

  const getOrderOrigin = (order: Order) => {
    if (order.table_id) {
      const tableNum = getTableNumber(order.table_id);
      return { type: 'table', label: `${t('dining.table')} ${tableNum}`, icon: UtensilsCrossed };
    }
    return { type: 'counter', label: order.customer_name || 'Balcão', icon: Store };
  };

  const calculateDuration = (openedAt: string | null, closedAt: string | null) => {
    if (!openedAt || !closedAt) return '-';
    const minutes = differenceInMinutes(parseISO(closedAt), parseISO(openedAt));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('dashboard.finished_orders')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('dashboard.finished_orders')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-2 opacity-50" />
            <p>{t('dashboard.no_finished_orders')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('dashboard.finished_orders')} ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-3">
              {orders.map((order) => {
                const origin = getOrderOrigin(order);
                const Icon = origin.icon;
                
                return (
                  <div
                    key={order.id}
                    className="rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full p-2 ${origin.type === 'table' ? 'bg-success/10' : 'bg-blue-500/10'}`}>
                          <Icon className={`h-4 w-4 ${origin.type === 'table' ? 'text-success' : 'text-blue-500'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{origin.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('dining.waiter')}: {getWaiterName(order.waiter_id)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-success">{formatCurrency(order.total || 0)}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {order.closed_at && format(parseISO(order.closed_at), 'HH:mm', { locale: getLocale() })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('orders.finished')}
                      </Badge>
                      <span>{t('orders.duration')}: {calculateDuration(order.opened_at, order.closed_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <OrderDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        order={selectedOrder}
      />
    </>
  );
}
