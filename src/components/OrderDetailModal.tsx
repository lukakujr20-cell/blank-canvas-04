import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import { 
  Clock, 
  User, 
  Store, 
  UtensilsCrossed, 
  Users,
  CheckCircle2,
  Timer,
  CreditCard,
  Banknote,
  Wallet,
  DollarSign
} from 'lucide-react';

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

interface OrderItem {
  id: string;
  order_id: string;
  dish_name: string;
  quantity: number;
  unit_price: number;
  status: string;
}

interface RestaurantTable {
  id: string;
  table_number: number;
}

interface Profile {
  id: string;
  full_name: string;
}

interface OrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPrint?: () => void;
  onOrderClosed?: () => void;
}

export default function OrderDetailModal({
  open,
  onOpenChange,
  order,
  onPrint,
  onOrderClosed,
}: OrderDetailModalProps) {
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [waiterProfile, setWaiterProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  const getLocale = () => {
    switch (language) {
      case 'pt-BR': return ptBR;
      case 'es': return es;
      default: return enUS;
    }
  };

  useEffect(() => {
    if (open && order) {
      fetchDetails();
      setShowPayment(false);
      setPaymentMethod('cash');
    } else {
      setItems([]);
      setTable(null);
      setWaiterProfile(null);
    }
  }, [open, order?.id]);

  const fetchDetails = async () => {
    if (!order) return;
    
    setLoading(true);
    try {
      const [itemsRes, profileRes] = await Promise.all([
        (supabase.from('order_items') as any).select('*').eq('order_id', order.id),
        supabase.from('profiles').select('*').eq('id', order.waiter_id).maybeSingle(),
      ]);

      setItems(itemsRes.data || []);
      setWaiterProfile(profileRes.data as any);

      if (order.table_id) {
        const { data: tableData } = await (supabase
          .from('restaurant_tables') as any)
          .select('*')
          .eq('id', order.table_id)
          .single();
        setTable(tableData);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (openedAt: string | null, closedAt: string | null) => {
    if (!openedAt) return '-';
    const start = parseISO(openedAt);
    const end = closedAt ? parseISO(closedAt) : new Date();
    const totalMinutes = differenceInMinutes(end, start);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const handleFinalizeSale = async () => {
    if (!order || !user) return;
    setProcessing(true);
    try {
      const total = order.total || 0;

      // If total is 0 and no items, just release the table
      if (total === 0 && items.length === 0) {
        await handleReleaseTable();
        return;
      }

      // Close the order
      await supabase
        .from('orders')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          payment_method: paymentMethod,
        })
        .eq('id', order.id);

      // Release the table if exists
      if (order.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'free', current_order_id: null })
          .eq('id', order.table_id);
      }

      toast({ title: t('billing.table_finalized') });
      // Clear local state before closing modal to prevent stale data
      setItems([]);
      setTable(null);
      setWaiterProfile(null);
      onOpenChange(false);
      onOrderClosed?.();
    } catch (error) {
      console.error('Error finalizing:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setProcessing(false);
      setShowPayment(false);
    }
  };

  const handleReleaseTable = async () => {
    if (!order) return;
    setProcessing(true);
    try {
      // Delete any lingering order items (zero-consumption cleanup)
      await (supabase.from('order_items') as any).delete().eq('order_id', order.id);

      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          closed_at: new Date().toISOString(),
          total: 0,
        })
        .eq('id', order.id);

      if (order.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'free', current_order_id: null })
          .eq('id', order.table_id);
      }

      toast({ title: t('dining.table_released') });
      // Clear local state before closing modal to prevent stale data
      setItems([]);
      setTable(null);
      setWaiterProfile(null);
      onOpenChange(false);
      onOrderClosed?.();
    } catch (error) {
      console.error('Error releasing:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (!order) return null;

  const isFinished = order.status === 'closed' || order.status === 'paid';
  const isOpen = order.status === 'open';
  const hasItems = items.length > 0;
  const total = order.total || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setShowPayment(false); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFinished ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Clock className="h-5 w-5 text-primary" />
            )}
            {t('orders.detail_title')}
          </DialogTitle>
          <DialogDescription>
            {order.opened_at && format(parseISO(order.opened_at), 'PPpp', { locale: getLocale() })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Origin */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {order.table_id ? (
                <UtensilsCrossed className="h-5 w-5 text-primary" />
              ) : (
                <Store className="h-5 w-5 text-primary" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {order.table_id 
                    ? `${t('dining.table')} ${table?.table_number || '?'}` 
                    : order.customer_name || 'Balcão'}
                </p>
                {order.guest_count && order.guest_count > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {order.guest_count} {t('dining.guests').toLowerCase()}
                  </p>
                )}
              </div>
              <Badge variant={isFinished ? 'default' : 'secondary'}>
                {isFinished ? t('orders.finished') : t('orders.active')}
              </Badge>
            </div>

            {/* Waiter */}
            {waiterProfile && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('dining.waiter')}</p>
                  <p className="font-medium">{waiterProfile.full_name}</p>
                </div>
              </div>
            )}

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{t('orders.opened_at')}</p>
                <p className="font-medium">
                  {order.opened_at ? format(parseISO(order.opened_at), 'HH:mm', { locale: getLocale() }) : '-'}
                </p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{t('orders.closed_at')}</p>
                <p className="font-medium">
                  {order.closed_at ? format(parseISO(order.closed_at), 'HH:mm', { locale: getLocale() }) : '-'}
                </p>
              </div>
            </div>

            {/* Duration */}
            {isFinished && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('orders.duration')}</p>
                  <p className="font-bold">{calculateDuration(order.opened_at, order.closed_at)}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Items */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                {t('orders.items')} ({items.length})
              </p>
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                      {t('dining.no_items')}
                    </p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{item.quantity}x {item.dish_name}</p>
                        </div>
                        <p className="font-medium">{formatCurrency(item.quantity * item.unit_price)}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <p className="font-semibold">{t('orders.total')}</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>

            {/* Payment method selection for open orders */}
            {isOpen && showPayment && hasItems && total > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-semibold">{t('billing.payment_method')}</p>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-3 gap-2">
                    <div>
                      <RadioGroupItem value="cash" id="odm-cash" className="peer sr-only" />
                      <Label htmlFor="odm-cash" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Banknote className="mb-1 h-5 w-5" />
                        <span className="text-xs font-medium">{t('billing.cash')}</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="card" id="odm-card" className="peer sr-only" />
                      <Label htmlFor="odm-card" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <CreditCard className="mb-1 h-5 w-5" />
                        <span className="text-xs font-medium">{t('billing.card')}</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="other" id="odm-other" className="peer sr-only" />
                      <Label htmlFor="odm-other" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Wallet className="mb-1 h-5 w-5" />
                        <span className="text-xs font-medium">{t('billing.other')}</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Action buttons for open orders */}
            {isOpen && (
              <div className="flex flex-col gap-2">
              {!hasItems || total === 0 ? (
                  <Button onClick={handleReleaseTable} disabled={processing} className="w-full" variant="outline">
                    {processing ? t('common.saving') : t('dining.release_table_no_consumption')}
                  </Button>
                ) : !showPayment ? (
                  <Button onClick={() => setShowPayment(true)} className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('billing.finalize_sale')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPayment(false)} disabled={processing}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleFinalizeSale} disabled={processing} className="flex-1">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {processing ? t('common.saving') : t('billing.finalize_release')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
