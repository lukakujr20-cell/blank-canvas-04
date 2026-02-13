import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Printer, CreditCard, Trash2, Plus, ShieldAlert, Users, Banknote, Wallet } from 'lucide-react';

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

interface BillReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  orderItems: OrderItem[];
  tableNumber?: number | null;
  waiterName: string;
  onAddItem: () => void;
  onClose: (paymentMethod?: string) => void;
  onPrint: () => void;
}

export default function BillReviewModal({
  open,
  onOpenChange,
  order,
  orderItems,
  tableNumber,
  waiterName,
  onAddItem,
  onClose,
  onPrint,
}: BillReviewModalProps) {
  const { role } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  const isAdmin = role === 'admin' || role === 'host';

  const handleRemoveItem = async (itemId: string) => {
    if (!isAdmin) {
      toast({
        title: t('common.error'),
        description: t('billing.admin_only_remove'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const item = orderItems.find(i => i.id === itemId);
      if (!item || !order) return;

      await supabase.from('order_items').delete().eq('id', itemId);

      const newTotal = (order.total || 0) - (item.unit_price * item.quantity);
      await supabase
        .from('orders')
        .update({ total: Math.max(0, newTotal) })
        .eq('id', order.id);

      toast({ title: t('dining.item_removed') });
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: t('common.error'),
        description: t('dining.remove_error'),
        variant: 'destructive',
      });
    }
  };

  const handleConfirmPayment = async () => {
    setProcessing(true);
    try {
      onClose(paymentMethod);
      setTimeout(() => {
        onPrint();
      }, 500);
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setProcessing(false);
      setConfirmPayment(false);
      setPaymentMethod('cash');
    }
  };

  if (!order) return null;

  const orderLabel = order.table_id 
    ? `${t('dining.table')} ${tableNumber}` 
    : order.customer_name || 'Balcão';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setConfirmPayment(false); setPaymentMethod('cash'); } onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('billing.review_title')}
          </DialogTitle>
          <DialogDescription>
            {orderLabel} • {t('dining.waiter')}: {waiterName}
            {order.guest_count && order.guest_count > 0 && (
              <span className="ml-2">
                <Users className="h-3 w-3 inline mr-1" />
                {order.guest_count}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[300px] pr-4">
          <div className="space-y-2">
            {orderItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {t('dining.no_items')}
              </div>
            ) : (
              orderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.dish_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x {formatCurrency(item.unit_price)}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </p>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {!isAdmin && orderItems.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4" />
            {t('billing.admin_only_remove_hint')}
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between py-2">
          <p className="text-xl font-bold">Total</p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(order.total || 0)}
          </p>
        </div>

        {/* Payment Method Selection */}
        {confirmPayment && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-semibold">{t('billing.payment_method')}</p>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-3 gap-2">
                <div>
                  <RadioGroupItem value="cash" id="pm-cash" className="peer sr-only" />
                  <Label
                    htmlFor="pm-cash"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Banknote className="mb-1 h-5 w-5" />
                    <span className="text-xs font-medium">{t('billing.cash')}</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="card" id="pm-card" className="peer sr-only" />
                  <Label
                    htmlFor="pm-card"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <CreditCard className="mb-1 h-5 w-5" />
                    <span className="text-xs font-medium">{t('billing.card')}</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="other" id="pm-other" className="peer sr-only" />
                  <Label
                    htmlFor="pm-other"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Wallet className="mb-1 h-5 w-5" />
                    <span className="text-xs font-medium">{t('billing.other')}</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onAddItem}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('dining.add_item')}
          </Button>
          
          {!confirmPayment ? (
            <Button
              onClick={() => setConfirmPayment(true)}
              disabled={orderItems.length === 0}
              className="w-full sm:w-auto"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {t('billing.finalize_sale')}
            </Button>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setConfirmPayment(false)}
                disabled={processing}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="default"
                onClick={handleConfirmPayment}
                disabled={processing}
              >
                <Printer className="mr-2 h-4 w-4" />
                {processing ? t('common.saving') : t('billing.close_and_print')}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
