import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSession } from '@/hooks/useSession';
import { useCurrency } from '@/contexts/CurrencyContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BillReviewModal from '@/components/BillReviewModal';
import TableManagementModal from '@/components/TableManagementModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Plus,
  Minus,
  X,
  ShoppingCart,
  AlertTriangle,
  Trash2,
  Store,
  Settings2,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RestaurantTable {
  id: string;
  table_number: number;
  capacity: number;
  status: string;
  current_order_id: string | null;
}

interface Order {
  id: string;
  table_id: string | null;
  status: string;
  waiter_id: string;
  opened_at: string;
  total: number;
  guest_count: number | null;
  customer_name: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string | null;
  dish_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  status: string;
  sent_at: string;
}

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface TechnicalSheet {
  id: string;
  dish_id: string;
  item_id: string;
  quantity_per_sale: number;
}

interface Item {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  units_per_package: number;
  recipe_units_per_consumption: number | null;
}

interface StockIssue {
  itemName: string;
  needed: number;
  available: number;
  unit: string;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function DiningRoom() {
  const { user, isAdmin, isHost, isSuperAdmin } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentSession } = useSession();
  
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [technicalSheets, setTechnicalSheets] = useState<TechnicalSheet[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [tableOptionsOpen, setTableOptionsOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  
  const [closeOrderConfirmOpen, setCloseOrderConfirmOpen] = useState(false);
  const [billReviewOpen, setBillReviewOpen] = useState(false);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [stockAlertOpen, setStockAlertOpen] = useState(false);
  const [counterOrderOpen, setCounterOrderOpen] = useState(false);
  const [tableManagementOpen, setTableManagementOpen] = useState(false);

  // Table options state
  const [tableStatus, setTableStatus] = useState<string>('free');
  const [guestCount, setGuestCount] = useState<number>(1);

  // Counter order state
  const [counterCustomerName, setCounterCustomerName] = useState('');

  // Current order data
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [dishQuantities, setDishQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
    
    // Set up realtime subscriptions
    const tablesChannel = supabase
      .channel('tables-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables' },
        (payload: RealtimePostgresChangesPayload<RestaurantTable>) => {
          if (payload.eventType === 'UPDATE') {
            setTables(current => 
              current.map(t => t.id === (payload.new as RestaurantTable).id ? payload.new as RestaurantTable : t)
            );
          }
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .subscribe();

    const orderItemsChannel = supabase
      .channel('order-items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => fetchOrderItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [tablesRes, ordersRes, orderItemsRes, dishesRes, sheetsRes, itemsRes, profilesRes] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('orders').select('*').eq('status', 'open'),
        supabase.from('order_items').select('*'),
        supabase.from('dishes').select('*').order('name'),
        supabase.from('technical_sheets').select('*'),
        supabase.from('items').select('id, name, unit, current_stock, units_per_package, recipe_units_per_consumption'),
        supabase.from('profiles').select('id, full_name'),
      ]);

      if (tablesRes.error) throw tablesRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (orderItemsRes.error) throw orderItemsRes.error;
      if (dishesRes.error) throw dishesRes.error;
      if (sheetsRes.error) throw sheetsRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setTables(tablesRes.data || []);
      setOrders(ordersRes.data || []);
      setOrderItems(orderItemsRes.data || []);
      setDishes(dishesRes.data || []);
      setTechnicalSheets(sheetsRes.data || []);
      setItems(itemsRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('common.error'),
        description: t('dining.load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').eq('status', 'open');
    if (data) setOrders(data);
  };

  const fetchOrderItems = async () => {
    const { data } = await supabase.from('order_items').select('*');
    if (data) setOrderItems(data);
  };

  const getTableOrder = (tableId: string) => {
    return orders.find(o => o.table_id === tableId && o.status === 'open');
  };

  const getOrderItems = (orderId: string) => {
    return orderItems.filter(oi => oi.order_id === orderId);
  };

  const getWaiterName = (waiterId: string) => {
    const profile = profiles.find(p => p.id === waiterId);
    return profile?.full_name || t('audit.unknown_user');
  };

  const getCurrentWaiterName = () => {
    if (!user) return '';
    return getWaiterName(user.id);
  };

  const handleTableClick = (table: RestaurantTable) => {
    setSelectedTable(table);
    setTableStatus(table.status);
    
    const existingOrder = getTableOrder(table.id);
    if (existingOrder) {
      // Occupied table with order → open POS directly
      navigateToPOS(existingOrder, table);
    } else {
      // Free/reserved table → show options
      setGuestCount(table.capacity);
      setTableOptionsOpen(true);
    }
  };

  const handleTableStatusChange = async () => {
    if (!selectedTable || !user) return;

    try {
      if (tableStatus === 'occupied') {
        // Check if there's already an order
        const existingOrder = getTableOrder(selectedTable.id);
        
        if (!existingOrder) {
          // Create new order
          const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single();
          const { data: newOrder, error } = await supabase
            .from('orders')
            .insert({
              table_id: selectedTable.id,
              waiter_id: user.id,
              status: 'open',
              guest_count: guestCount,
              restaurant_id: profile?.restaurant_id,
              session_id: currentSession?.id || null,
            })
            .select()
            .single();

          if (error) throw error;

          await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied', current_order_id: newOrder.id })
            .eq('id', selectedTable.id);

          setCurrentOrder(newOrder);
          setTableOptionsOpen(false);
          navigateToPOS(newOrder, selectedTable);
        } else {
          // Update guest count
          await supabase
            .from('orders')
            .update({ guest_count: guestCount })
            .eq('id', existingOrder.id);

          setCurrentOrder({ ...existingOrder, guest_count: guestCount });
          setTableOptionsOpen(false);
          navigateToPOS({ ...existingOrder, guest_count: guestCount }, selectedTable);
        }
      } else {
        // Update table status only (free or reserved)
        await supabase
          .from('restaurant_tables')
          .update({ status: tableStatus, current_order_id: null })
          .eq('id', selectedTable.id);
        
        toast({ title: t('dining.status_updated') });
        setTableOptionsOpen(false);
      }

      fetchData();
    } catch (error) {
      console.error('Error updating table:', error);
      toast({
        title: t('common.error'),
        description: t('dining.order_create_error'),
        variant: 'destructive',
      });
    }
  };

  const openExistingOrder = () => {
    if (!selectedTable) return;
    
    const existingOrder = getTableOrder(selectedTable.id);
    if (existingOrder) {
      setCurrentOrder(existingOrder);
      setCurrentOrderItems(getOrderItems(existingOrder.id));
      setDishQuantities({});
      setTableOptionsOpen(false);
      setOrderModalOpen(true);
    }
  };

  const handleCreateCounterOrder = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single();
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert({
          table_id: null,
          waiter_id: user.id,
          status: 'open',
          guest_count: 1,
          customer_name: counterCustomerName || `Balcão #${Date.now().toString().slice(-4)}`,
          restaurant_id: profile?.restaurant_id,
          session_id: currentSession?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentOrder(newOrder);
      setCounterOrderOpen(false);
      setCounterCustomerName('');
      navigateToPOS(newOrder, null);
      fetchData();
    } catch (error) {
      console.error('Error creating counter order:', error);
      toast({
        title: t('common.error'),
        description: t('dining.order_create_error'),
        variant: 'destructive',
      });
    }
  };

  const validateStockForDish = (dishId: string, quantity: number): StockIssue[] => {
    const issues: StockIssue[] = [];
    const dishSheets = technicalSheets.filter(ts => ts.dish_id === dishId);

    for (const sheet of dishSheets) {
      const item = items.find(i => i.id === sheet.item_id);
      if (!item) continue;

      const neededUnits = sheet.quantity_per_sale * quantity;
      const totalConversion = item.units_per_package * (item.recipe_units_per_consumption || 1);
      const neededPackages = neededUnits / totalConversion;

      if (item.current_stock < neededPackages) {
        issues.push({
          itemName: item.name,
          needed: neededPackages,
          available: item.current_stock,
          unit: item.unit,
        });
      }
    }

    return issues;
  };

  const addDishToOrder = async (dish: Dish) => {
    if (!currentOrder || !user) return;

    const quantity = dishQuantities[dish.id] || 1;
    
    // Validate stock
    const issues = validateStockForDish(dish.id, quantity);
    if (issues.length > 0) {
      setStockIssues(issues);
      setStockAlertOpen(true);
      return;
    }

    try {
      // Add item to order
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: currentOrder.id,
          dish_id: dish.id,
          dish_name: dish.name,
          quantity,
          unit_price: dish.price,
          status: 'pending',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Deduct stock
      const dishSheets = technicalSheets.filter(ts => ts.dish_id === dish.id);
      for (const sheet of dishSheets) {
        const item = items.find(i => i.id === sheet.item_id);
        if (!item) continue;

        const neededUnits = sheet.quantity_per_sale * quantity;
        const totalConversion = item.units_per_package * (item.recipe_units_per_consumption || 1);
        const neededPackages = neededUnits / totalConversion;
        const newStock = item.current_stock - neededPackages;

        await supabase
          .from('items')
          .update({
            current_stock: newStock,
            last_count_date: new Date().toISOString().split('T')[0],
            last_counted_by: user.id,
          })
          .eq('id', item.id);

        // Record in stock history with order reference
        const orderLabel = currentOrder.table_id 
          ? `Mesa ${selectedTable?.table_number || '?'}` 
          : `Balcão - ${currentOrder.customer_name}`;
        
        await supabase
          .from('stock_history')
          .insert({
            item_id: item.id,
            previous_stock: item.current_stock,
            new_stock: newStock,
            changed_by: user.id,
            movement_type: 'withdrawal',
            reason: `${t('dining.sale_reason')}: ${dish.name} x${quantity} - ${orderLabel}`,
            order_id: currentOrder.id,
            order_item_id: orderItem.id,
          });
      }

      // Update order total
      const newTotal = (currentOrder.total || 0) + (dish.price * quantity);
      await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', currentOrder.id);

      toast({ title: t('dining.item_added') });
      setDishQuantities({ ...dishQuantities, [dish.id]: 1 });
      setMenuModalOpen(false);
      fetchData();
      
      // Refresh current order items
      const { data: updatedItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', currentOrder.id);
      if (updatedItems) setCurrentOrderItems(updatedItems);

      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', currentOrder.id)
        .single();
      if (updatedOrder) setCurrentOrder(updatedOrder);

    } catch (error) {
      console.error('Error adding dish to order:', error);
      toast({
        title: t('common.error'),
        description: t('dining.add_item_error'),
        variant: 'destructive',
      });
    }
  };

  const removeOrderItem = async (itemId: string) => {
    try {
      const item = currentOrderItems.find(i => i.id === itemId);
      if (!item || !currentOrder) return;

      await supabase.from('order_items').delete().eq('id', itemId);

      const newTotal = (currentOrder.total || 0) - (item.unit_price * item.quantity);
      await supabase
        .from('orders')
        .update({ total: Math.max(0, newTotal) })
        .eq('id', currentOrder.id);

      setCurrentOrderItems(current => current.filter(i => i.id !== itemId));
      setCurrentOrder(prev => prev ? { ...prev, total: Math.max(0, newTotal) } : null);
      
      toast({ title: t('dining.item_removed') });
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const closeOrder = async (paymentMethod?: string) => {
    if (!currentOrder) return;

    const hasItems = currentOrderItems.length > 0;
    const isCancel = !hasItems || (currentOrder.total || 0) === 0;

    try {
      if (isCancel) {
        // Cancel: mark order as cancelled (audit trail), no financial record
        await supabase.from('order_items').delete().eq('order_id', currentOrder.id);
        await supabase.from('orders').update({
          status: 'cancelled',
          closed_at: new Date().toISOString(),
          total: 0,
        }).eq('id', currentOrder.id);
      } else {
        // Normal close with payment
        await supabase
          .from('orders')
          .update({ 
            status: 'closed', 
            closed_at: new Date().toISOString(),
            payment_method: paymentMethod || null,
          })
          .eq('id', currentOrder.id);
      }

      // Release the table via Realtime
      if (selectedTable) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'free', current_order_id: null })
          .eq('id', selectedTable.id);
      }

      toast({ title: isCancel ? t('dining.table_released') : t('billing.table_finalized') });
      setCloseOrderConfirmOpen(false);
      setOrderModalOpen(false);
      setBillReviewOpen(false);
      setCurrentOrder(null);
      setCurrentOrderItems([]);
      setSelectedTable(null);
      fetchData();
    } catch (error) {
      console.error('Error closing order:', error);
      toast({
        title: t('common.error'),
        description: t('dining.close_error'),
        variant: 'destructive',
      });
    }
  };

  const cancelTable = () => {
    closeOrder();
  };

  const getOrderLabel = () => {
    if (currentOrder?.table_id && selectedTable) {
      return `${t('dining.table')} ${selectedTable.table_number}`;
    }
    return currentOrder?.customer_name || 'Balcão';
  };

  const navigateToPOS = (order: Order, table: RestaurantTable | null) => {
    const label = table
      ? `${t('dining.table')} ${table.table_number}`
      : order.customer_name || 'Balcão';
    const params = new URLSearchParams({
      orderId: order.id,
      orderLabel: label,
      currentTotal: String(order.total || 0),
    });
    if (table) params.set('tableId', table.id);
    navigate(`/pos?${params.toString()}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'free': return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      case 'occupied': return 'border-red-500 bg-red-50 dark:bg-red-950/20';
      case 'reserved': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      default: return '';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'free': return 'default' as const;
      case 'occupied': return 'destructive' as const;
      case 'reserved': return 'secondary' as const;
      default: return 'default' as const;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'free': return t('dining.status_free');
      case 'occupied': return t('dining.status_occupied');
      case 'reserved': return t('dining.status_reserved');
      default: return status;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Counter orders (no table)
  const counterOrders = orders.filter(o => !o.table_id && o.status === 'open');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{t('dining.title')}</h1>
            <p className="mt-1 text-muted-foreground">{t('dining.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Manage Tables button - visible only to host/super_admin */}
            {(isHost || isSuperAdmin) && (
              <Button 
                variant="outline"
                size="lg" 
                className="h-14 text-lg gap-2"
                onClick={() => setTableManagementOpen(true)}
              >
                <Settings2 className="h-5 w-5" />
                {t('dining.manage_tables')}
              </Button>
            )}
            <Button 
              size="lg" 
              className="h-14 text-lg gap-2"
              onClick={() => setCounterOrderOpen(true)}
            >
              <Store className="h-5 w-5" />
              {t('dining.new_counter_order')}
            </Button>
          </div>
        </div>

        {/* Counter Orders (Takeaway) */}
        {counterOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{t('dining.counter_orders')}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {counterOrders.map((order) => (
                <Card
                  key={order.id}
                  className="cursor-pointer border-blue-500 bg-blue-50 transition-all hover:scale-105 hover:shadow-lg dark:bg-blue-950/20"
                  onClick={() => {
                    setCurrentOrder(order);
                    setCurrentOrderItems(getOrderItems(order.id));
                    setSelectedTable(null);
                    setDishQuantities({});
                    setOrderModalOpen(true);
                  }}
                >
                  <CardContent className="flex flex-col items-center justify-center p-4">
                    <Store className="h-10 w-10 text-blue-600" />
                    <p className="mt-2 text-center text-sm font-medium">
                      {order.customer_name || 'Balcão'}
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      {formatCurrency(order.total || 0)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tables Grid */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t('dining.tables')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {tables.map((table) => {
              const order = getTableOrder(table.id);
              
              return (
                <Card
                  key={table.id}
                  className={cn(
                    'cursor-pointer transition-all hover:scale-105 hover:shadow-lg',
                    getStatusColor(table.status)
                  )}
                  onClick={() => handleTableClick(table)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-4">
                    <div className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold',
                      table.status === 'free' ? 'bg-green-500 text-white' 
                        : table.status === 'occupied' ? 'bg-red-500 text-white' 
                        : 'bg-yellow-500 text-white'
                    )}>
                      {table.table_number}
                    </div>
                    
                    <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{order?.guest_count || table.capacity}</span>
                    </div>
                    
                    <Badge 
                      variant={getStatusBadgeVariant(table.status)}
                      className="mt-2"
                    >
                      {getStatusLabel(table.status)}
                    </Badge>
                    
                    {order && (
                      <p className="mt-2 text-sm font-bold text-primary">
                        {formatCurrency(order.total || 0)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Table Options Modal */}
        <Dialog open={tableOptionsOpen} onOpenChange={setTableOptionsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t('dining.table')} {selectedTable?.table_number}
              </DialogTitle>
              <DialogDescription>
                {t('dining.table_options_desc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('dining.status')}</Label>
                <Select value={tableStatus} onValueChange={setTableStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">{t('dining.status_free')}</SelectItem>
                    <SelectItem value="occupied">{t('dining.status_occupied')}</SelectItem>
                    <SelectItem value="reserved">{t('dining.status_reserved')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tableStatus === 'occupied' && (
                <div className="space-y-2">
                  <Label>{t('dining.guest_count')}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                      min={1}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setGuestCount(guestCount + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {getTableOrder(selectedTable?.id || '') && (
                <Button variant="outline" onClick={openExistingOrder} className="w-full sm:w-auto">
                  {t('dining.view_order')}
                </Button>
              )}
              <Button onClick={handleTableStatusChange} className="w-full sm:w-auto">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Counter Order Modal */}
        <Dialog open={counterOrderOpen} onOpenChange={setCounterOrderOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                {t('dining.new_counter_order')}
              </DialogTitle>
              <DialogDescription>
                {t('dining.counter_order_desc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('dining.customer_name')}</Label>
                <Input
                  placeholder={t('dining.customer_name_placeholder')}
                  value={counterCustomerName}
                  onChange={(e) => setCounterCustomerName(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCreateCounterOrder} className="w-full">
                {t('dining.start_order')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Modal */}
        <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getOrderLabel()}
              </DialogTitle>
              <DialogDescription>
                {t('dining.order_description')} • {t('dining.waiter')}: {currentOrder ? getWaiterName(currentOrder.waiter_id) : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* Order Items */}
              {currentOrderItems.length > 0 ? (
                <div className="space-y-2">
                  {currentOrderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{item.dish_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity}x {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeOrderItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  {t('dining.no_items')}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-lg font-bold">Total</p>
                <p className="text-lg font-bold">
                  {formatCurrency(currentOrder?.total || 0)}
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3">
                <Button
                  size="lg"
                  className="h-14 text-lg"
                  onClick={() => {
                    setOrderModalOpen(false);
                    if (currentOrder) navigateToPOS(currentOrder, selectedTable);
                  }}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t('dining.add_item')}
                </Button>
              </div>

              {currentOrderItems.length > 0 ? (
                <Button
                  size="lg"
                  variant="default"
                  className="h-14 w-full text-lg"
                  onClick={() => {
                    setOrderModalOpen(false);
                    setBillReviewOpen(true);
                  }}
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  {t('dining.close_order')}
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-14 w-full text-lg"
                  onClick={() => {
                    setOrderModalOpen(false);
                    cancelTable();
                  }}
                >
                  <X className="mr-2 h-5 w-5" />
                  {t('dining.cancel_release_table')}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Menu Modal */}
        <Dialog open={menuModalOpen} onOpenChange={setMenuModalOpen}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('dining.menu')}</DialogTitle>
              <DialogDescription>
                {t('dining.select_dish')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-4">
              {dishes.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {t('dining.no_dishes')}
                </div>
              ) : (
                dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{dish.name}</p>
                      {dish.description && (
                        <p className="text-sm text-muted-foreground">{dish.description}</p>
                      )}
                      <p className="mt-1 font-bold text-primary">
                        {formatCurrency(dish.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => {
                          const current = dishQuantities[dish.id] || 1;
                          if (current > 1) {
                            setDishQuantities({ ...dishQuantities, [dish.id]: current - 1 });
                          }
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {dishQuantities[dish.id] || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => {
                          const current = dishQuantities[dish.id] || 1;
                          setDishQuantities({ ...dishQuantities, [dish.id]: current + 1 });
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="lg"
                        className="ml-2 h-10"
                        onClick={() => addDishToOrder(dish)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Close Order Confirmation */}
        <AlertDialog open={closeOrderConfirmOpen} onOpenChange={setCloseOrderConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dining.close_order_confirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('dining.close_order_desc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => closeOrder()}>
                {t('dining.confirm_close')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Stock Alert */}
        <AlertDialog open={stockAlertOpen} onOpenChange={setStockAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('dining.stock_insufficient')}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                {stockIssues.map((issue, idx) => (
                  <p key={idx} className="text-sm">
                    <strong>{issue.itemName}</strong>: {t('dining.needed')} {issue.needed.toFixed(2)} {issue.unit}, {t('dining.available')} {issue.available.toFixed(2)} {issue.unit}
                  </p>
                ))}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setStockAlertOpen(false)}>
                {t('common.cancel')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bill Review Modal */}
        <BillReviewModal
          open={billReviewOpen}
          onOpenChange={setBillReviewOpen}
          order={currentOrder}
          orderItems={currentOrderItems}
          tableNumber={selectedTable?.table_number}
          waiterName={currentOrder ? getWaiterName(currentOrder.waiter_id) : ''}
          onAddItem={() => {
            setBillReviewOpen(false);
            setMenuModalOpen(true);
          }}
          onClose={closeOrder}
        />

        {/* Table Management Modal */}
        <TableManagementModal
          open={tableManagementOpen}
          onOpenChange={setTableManagementOpen}
          onTablesUpdated={fetchData}
        />

      </div>

    </DashboardLayout>
  );
}
