import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChefHat, Clock, CheckCircle2, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FinishedOrdersSection } from '@/components/FinishedOrdersSection';
import { useSession } from '@/hooks/useSession';

interface OrderItem {
  id: string;
  order_id: string;
  dish_name: string;
  quantity: number;
  notes: string | null;
  status: string;
  sent_at: string;
}

interface Order {
  id: string;
  table_id: string | null;
  customer_name: string | null;
  status: string;
  opened_at: string;
}

interface RestaurantTable {
  id: string;
  table_number: number;
}

interface KitchenOrder {
  orderId: string;
  orderLabel: string;
  openedAt: string;
  items: OrderItem[];
}

export default function KitchenPanel() {
  const { user, role, isKitchen, isAdmin, restaurantId } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [restaurantName, setRestaurantName] = useState('');
  const [userName, setUserName] = useState('');
  const { currentSession } = useSession();

  // Block staff from accessing kitchen panel
  useEffect(() => {
    if (role && !isKitchen && !isAdmin) {
      navigate('/dashboard');
    }
  }, [role, isKitchen, isAdmin, navigate]);

  // Fetch restaurant name and user name
  useEffect(() => {
    const fetchMeta = async () => {
      if (restaurantId) {
        const { data } = await supabase
          .from('restaurants')
          .select('name')
          .eq('id', restaurantId)
          .maybeSingle();
        if (data) setRestaurantName(data.name);
      }
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (data?.full_name) setUserName(data.full_name);
      }
    };
    fetchMeta();
  }, [restaurantId, user?.id]);

  const getDateLocale = () => {
    switch (language) {
      case 'es': return es;
      case 'en': return enUS;
      default: return ptBR;
    }
  };

  const fetchKitchenOrders = async () => {
    try {
      // Fetch open orders filtered by restaurant_id
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Filter by restaurant if available
      const filteredOrders = restaurantId
        ? (orders || []).filter(o => o.restaurant_id === restaurantId)
        : (orders || []);

      if (filteredOrders.length === 0) {
        setKitchenOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = filteredOrders.map(o => o.id);

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)
        .eq('status', 'pending');

      if (itemsError) throw itemsError;

      // Fetch items table to check direct_sale flag
      const { data: itemsData } = await supabase
        .from('items')
        .select('id, direct_sale');

      const directSaleIds = new Set(
        (itemsData || []).filter(i => i.direct_sale).map(i => i.id)
      );

      const { data: tables, error: tablesError } = await supabase
        .from('restaurant_tables')
        .select('id, table_number');

      if (tablesError) throw tablesError;

      const ordersWithItems: KitchenOrder[] = [];

      for (const order of filteredOrders) {
        // Filter out direct sale items (they skip the kitchen)
        const items = (orderItems || [])
          .filter(item => item.order_id === order.id)
          .filter(item => !item.dish_id || !directSaleIds.has(item.dish_id));
        
        if (items.length === 0) continue;

        let orderLabel = order.customer_name || 'Balcão';
        if (order.table_id) {
          const table = (tables || []).find(t => t.id === order.table_id);
          orderLabel = `${t('dining.table')} ${table?.table_number || '?'}`;
        }

        ordersWithItems.push({
          orderId: order.id,
          orderLabel,
          openedAt: order.opened_at || order.created_at,
          items,
        });
      }

      ordersWithItems.sort((a, b) => 
        new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()
      );

      setKitchenOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
      toast({
        title: t('common.error'),
        description: t('kitchen.load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchKitchenOrders();
    }

    const ordersChannel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchKitchenOrders()
      )
      .subscribe();

    const itemsChannel = supabase
      .channel('kitchen-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => fetchKitchenOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [restaurantId]);

  const markItemAsReady = async (itemId: string) => {
    try {
      await supabase
        .from('order_items')
        .update({ status: 'ready' })
        .eq('id', itemId);

      toast({ title: t('kitchen.item_ready') });
      fetchKitchenOrders();
    } catch (error) {
      console.error('Error marking item as ready:', error);
      toast({
        title: t('common.error'),
        description: t('kitchen.update_error'),
        variant: 'destructive',
      });
    }
  };

  const markOrderAsReady = async (orderId: string, items: OrderItem[]) => {
    try {
      for (const item of items) {
        if (item.status === 'pending') {
          await supabase
            .from('order_items')
            .update({ status: 'ready' })
            .eq('id', item.id);
        }
      }

      toast({ title: t('kitchen.order_ready') });
      fetchKitchenOrders();
    } catch (error) {
      console.error('Error marking order as ready:', error);
      toast({
        title: t('common.error'),
        description: t('kitchen.update_error'),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{t('kitchen.title')}</h1>
              <p className="text-muted-foreground">
                {restaurantName && <span className="font-medium">{restaurantName}</span>}
                {restaurantName && userName && ' · '}
                {userName && <span>{userName}</span>}
                {!restaurantName && !userName && t('kitchen.subtitle')}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {kitchenOrders.reduce((acc, order) => acc + order.items.length, 0)} {t('kitchen.pending_items')}
          </Badge>
        </div>

        {/* Orders Grid */}
        {kitchenOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UtensilsCrossed className="h-16 w-16 text-muted-foreground/50" />
              <h3 className="mt-4 text-xl font-semibold">{t('kitchen.no_orders')}</h3>
              <p className="mt-2 text-muted-foreground">{t('kitchen.no_orders_desc')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {kitchenOrders.map((order) => (
              <Card 
                key={order.orderId}
                className={cn(
                  "transition-all hover:shadow-lg",
                  "border-l-4 border-l-orange-500"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">
                      {order.orderLabel}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(order.openedAt), {
                          addSuffix: true,
                          locale: getDateLocale(),
                        })}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-bold">
                            {item.quantity}x
                          </Badge>
                          <span className="font-medium">{item.dish_name}</span>
                        </div>
                        {item.notes && (
                          <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => markItemAsReady(item.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    className="w-full mt-4"
                    size="lg"
                    onClick={() => markOrderAsReady(order.orderId, order.items)}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {t('kitchen.mark_all_ready')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Finished Orders Section */}
        <FinishedOrdersSection sessionStartTime={currentSession?.start_time} />
      </div>
    </DashboardLayout>
  );
}
