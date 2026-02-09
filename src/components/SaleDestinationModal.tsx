import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Store, UtensilsCrossed } from 'lucide-react';

interface RestaurantTable {
  id: string;
  table_number: number;
  status: string;
  current_order_id: string | null;
}

interface Order {
  id: string;
  table_id: string | null;
  customer_name: string | null;
}

interface SaleDestinationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (destination: { type: 'table' | 'counter'; tableId?: string; tableNumber?: number; customerName?: string; orderId: string }) => void;
  dishName: string;
  quantity: number;
}

export default function SaleDestinationModal({
  open,
  onOpenChange,
  onConfirm,
  dishName,
  quantity,
}: SaleDestinationModalProps) {
  const { t } = useLanguage();
  const [destinationType, setDestinationType] = useState<'table' | 'counter'>('table');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('orders').select('*').eq('status', 'open'),
      ]);

      setTables(tablesRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const getTableOrder = (tableId: string) => {
    return orders.find(o => o.table_id === tableId);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (destinationType === 'table') {
        if (!selectedTableId) return;
        
        const table = tables.find(t => t.id === selectedTableId);
        let existingOrder = getTableOrder(selectedTableId);
        
        if (!existingOrder) {
          // Create new order for the table
          const { data: user } = await supabase.auth.getUser();
          const { data: newOrder, error } = await supabase
            .from('orders')
            .insert({
              table_id: selectedTableId,
              waiter_id: user.user?.id,
              status: 'open',
              guest_count: 1,
            })
            .select()
            .single();

          if (error) throw error;

          await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied', current_order_id: newOrder.id })
            .eq('id', selectedTableId);

          existingOrder = newOrder;
        }

        onConfirm({
          type: 'table',
          tableId: selectedTableId,
          tableNumber: table?.table_number,
          orderId: existingOrder.id,
        });
      } else {
        // Counter order
        const { data: user } = await supabase.auth.getUser();
        const name = customerName.trim() || `Balcão #${Date.now().toString().slice(-4)}`;
        
        // Check if there's an existing counter order with this name
        let existingOrder = orders.find(o => !o.table_id && o.customer_name === name);
        
        if (!existingOrder) {
          const { data: newOrder, error } = await supabase
            .from('orders')
            .insert({
              table_id: null,
              waiter_id: user.user?.id,
              status: 'open',
              guest_count: 1,
              customer_name: name,
            })
            .select()
            .single();

          if (error) throw error;
          existingOrder = newOrder;
        }

        onConfirm({
          type: 'counter',
          customerName: name,
          orderId: existingOrder.id,
        });
      }
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const occupiedTables = tables.filter(t => t.status === 'occupied' || getTableOrder(t.id));
  const freeTables = tables.filter(t => t.status !== 'occupied' && !getTableOrder(t.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dishes.sale_destination')}</DialogTitle>
          <DialogDescription>
            {t('dishes.sale_destination_desc')
              .replace('{dish}', dishName)
              .replace('{quantity}', quantity.toString())}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={destinationType}
            onValueChange={(v) => setDestinationType(v as 'table' | 'counter')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => setDestinationType('table')}>
              <RadioGroupItem value="table" id="table" />
              <Label htmlFor="table" className="flex items-center gap-2 cursor-pointer flex-1">
                <UtensilsCrossed className="h-5 w-5" />
                {t('dishes.destination_table')}
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => setDestinationType('counter')}>
              <RadioGroupItem value="counter" id="counter" />
              <Label htmlFor="counter" className="flex items-center gap-2 cursor-pointer flex-1">
                <Store className="h-5 w-5" />
                {t('dishes.destination_counter')}
              </Label>
            </div>
          </RadioGroup>

          {destinationType === 'table' && (
            <div className="space-y-2">
              <Label>{t('dishes.select_table')}</Label>
              <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dishes.select_table_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {occupiedTables.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {t('dishes.tables_occupied')}
                      </div>
                      {occupiedTables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          {t('dining.table')} {table.table_number} ({t('dining.status_occupied')})
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {freeTables.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {t('dishes.tables_free')}
                      </div>
                      {freeTables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          {t('dining.table')} {table.table_number}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {destinationType === 'counter' && (
            <div className="space-y-2">
              <Label>{t('dining.customer_name')}</Label>
              <Input
                placeholder={t('dining.customer_name_placeholder')}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (destinationType === 'table' && !selectedTableId)}
          >
            {loading ? t('common.saving') : t('dishes.send_order')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
