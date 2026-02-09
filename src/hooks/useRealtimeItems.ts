import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Item {
  id: string;
  category_id: string;
  name: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  expiry_date: string | null;
  last_count_date: string | null;
  last_counted_by?: string | null;
}

type ItemPayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}>;

export function useRealtimeItems(initialItems: Item[]) {
  const [items, setItems] = useState<Item[]>(initialItems);

  // Sync with initialItems when they change (e.g., on initial load)
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Optimistic update function
  const optimisticUpdate = useCallback((itemId: string, updates: Partial<Item>) => {
    setItems(current => 
      current.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  }, []);

  // Rollback function for failed updates
  const rollback = useCallback((itemId: string, previousState: Partial<Item>) => {
    setItems(current =>
      current.map(item =>
        item.id === itemId ? { ...item, ...previousState } : item
      )
    );
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('items-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        (payload: ItemPayload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as unknown as Item;
            setItems(current => {
              // Avoid duplicates
              if (current.some(item => item.id === newItem.id)) {
                return current;
              }
              return [...current, newItem];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as unknown as Item;
            setItems(current =>
              current.map(item =>
                item.id === updatedItem.id ? updatedItem : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedItem = payload.old as { id: string };
            setItems(current =>
              current.filter(item => item.id !== deletedItem.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    items,
    setItems,
    optimisticUpdate,
    rollback,
  };
}
