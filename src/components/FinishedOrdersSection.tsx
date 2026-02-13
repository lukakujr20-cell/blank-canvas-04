import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';

interface FinishedOrder {
  id: string;
  table_id: string | null;
  customer_name: string | null;
  total: number;
  waiter_id: string;
  opened_at: string;
  closed_at: string;
  items: { id: string; dish_name: string; quantity: number; unit_price: number; notes: string | null }[];
  table_number?: number;
  waiter_name?: string;
}

interface FinishedOrdersSectionProps {
  sessionStartTime?: string | null;
}

export function FinishedOrdersSection({ sessionStartTime }: FinishedOrdersSectionProps) {
  const { restaurantId } = useAuth();
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [orders, setOrders] = useState<FinishedOrder[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<FinishedOrder | null>(null);

  const getDateLocale = () => {
    switch (language) {
      case 'es': return es;
      case 'en': return enUS;
      default: return ptBR;
    }
  };

  useEffect(() => {
    fetchFinishedOrders();

    const channel = supabase
      .channel('finished-orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchFinishedOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, sessionStartTime]);

  const fetchFinishedOrders = async () => {
    if (!restaurantId) return;

    try {
      let query = supabase
        .from('orders')
        .select(`
          id, table_id, customer_name, total, waiter_id, opened_at, closed_at,
          order_items (id, dish_name, quantity, unit_price, notes)
        `)
        .eq('status', 'closed')
        .eq('restaurant_id', restaurantId)
        .order('closed_at', { ascending: false })
        .limit(50);

      if (sessionStartTime) {
        query = query.gte('closed_at', sessionStartTime);
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('closed_at', today.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const tableIds = [...new Set((data || []).filter(o => o.table_id).map(o => o.table_id!))];
      const waiterIds = [...new Set((data || []).map(o => o.waiter_id))];

      const [tablesRes, profilesRes] = await Promise.all([
        tableIds.length > 0 ? supabase.from('restaurant_tables').select('id, table_number').in('id', tableIds) : { data: [] },
        waiterIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', waiterIds) : { data: [] },
      ]);

      const tablesMap = new Map((tablesRes.data || []).map(t => [t.id, t.table_number]));
      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p.full_name]));

      const enriched: FinishedOrder[] = (data || []).map(order => ({
        ...order,
        items: (order.order_items as any[]) || [],
        table_number: order.table_id ? tablesMap.get(order.table_id) : undefined,
        waiter_name: profilesMap.get(order.waiter_id) || undefined,
      }));

      setOrders(enriched);
    } catch (error) {
      console.error('Error fetching finished orders:', error);
    }
  };

  if (orders.length === 0 && !expanded) return null;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <>
      <Card className="border-dashed">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {t('kitchen.finished_orders')}
              </CardTitle>
              <Badge variant="secondary">{orders.length}</Badge>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
        </CardHeader>
        {expanded && (
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('kitchen.no_finished')}
              </p>
            ) : (
              <div className="space-y-2">
                {orders.map(order => {
                  const label = order.table_number
                    ? `${t('dining.table')} ${order.table_number}`
                    : order.customer_name || 'Balcão';

                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.items.length} {t('orders.items')} • {order.waiter_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.total || 0)}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.closed_at && formatDistanceToNow(new Date(order.closed_at), {
                            addSuffix: true,
                            locale: getDateLocale(),
                          })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('orders.detail_title')}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('orders.opened_at')}</p>
                  <p className="font-medium">
                    {format(new Date(selectedOrder.opened_at), 'HH:mm', { locale: getDateLocale() })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('orders.closed_at')}</p>
                  <p className="font-medium">
                    {selectedOrder.closed_at && format(new Date(selectedOrder.closed_at), 'HH:mm', { locale: getDateLocale() })}
                  </p>
                </div>
                {selectedOrder.waiter_name && (
                  <div>
                    <p className="text-muted-foreground">{t('dining.waiter')}</p>
                    <p className="font-medium">{selectedOrder.waiter_name}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg divide-y">
                {selectedOrder.items.map(item => (
                  <div key={item.id} className="flex justify-between p-3 text-sm">
                    <div>
                      <span className="font-medium">{item.quantity}x</span> {item.dish_name}
                      {item.notes && <p className="text-xs text-muted-foreground">📝 {item.notes}</p>}
                    </div>
                    <span className="font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between p-3 bg-muted rounded-lg font-bold">
                <span>{t('orders.total')}</span>
                <span>{formatCurrency(selectedOrder.total || 0)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
