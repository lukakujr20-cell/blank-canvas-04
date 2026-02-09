import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OfflineOrderItem {
  dish_id: string;
  dish_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

interface OfflineOrder {
  id: string;
  table_id: string | null;
  customer_name: string | null;
  waiter_id: string;
  items: OfflineOrderItem[];
  created_at: string;
  restaurant_id: string;
}

const OFFLINE_ORDERS_KEY = 'offline_orders';

export function useOfflineOrders() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState<OfflineOrder[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Load pending orders from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
    if (stored) {
      try {
        setPendingOrders(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing offline orders:', e);
        localStorage.removeItem(OFFLINE_ORDERS_KEY);
      }
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingOrders.length > 0) {
      syncPendingOrders();
    }
  }, [isOnline]);

  const savePendingOrders = useCallback((orders: OfflineOrder[]) => {
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
    setPendingOrders(orders);
  }, []);

  const addOfflineOrder = useCallback((order: Omit<OfflineOrder, 'id' | 'created_at'>) => {
    const newOrder: OfflineOrder = {
      ...order,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    const updated = [...pendingOrders, newOrder];
    savePendingOrders(updated);

    return newOrder;
  }, [pendingOrders, savePendingOrders]);

  const syncPendingOrders = useCallback(async () => {
    if (syncing || pendingOrders.length === 0) return;

    setSyncing(true);
    const failedOrders: OfflineOrder[] = [];

    for (const order of pendingOrders) {
      try {
        // Create the order in the database
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            table_id: order.table_id,
            customer_name: order.customer_name,
            waiter_id: order.waiter_id,
            restaurant_id: order.restaurant_id,
            status: 'open',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Insert order items
        if (order.items.length > 0) {
          const itemsToInsert = order.items.map(item => ({
            order_id: orderData.id,
            dish_id: item.dish_id,
            dish_name: item.dish_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes,
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }

        console.log(`Synced offline order ${order.id} as ${orderData.id}`);
      } catch (error) {
        console.error(`Failed to sync order ${order.id}:`, error);
        failedOrders.push(order);
      }
    }

    savePendingOrders(failedOrders);
    setSyncing(false);
  }, [pendingOrders, syncing, savePendingOrders]);

  const clearPendingOrders = useCallback(() => {
    localStorage.removeItem(OFFLINE_ORDERS_KEY);
    setPendingOrders([]);
  }, []);

  return {
    isOnline,
    pendingOrders,
    addOfflineOrder,
    syncPendingOrders,
    clearPendingOrders,
    syncing,
    hasPendingOrders: pendingOrders.length > 0,
  };
}
