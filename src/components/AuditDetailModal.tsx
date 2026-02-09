import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatQuantity, formatQuantityChange } from '@/lib/formatNumber';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import {
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw, 
  Package, 
  User, 
  Calendar,
  FileText,
  UtensilsCrossed,
  Store,
  Users
} from 'lucide-react';

interface StockHistoryEntry {
  id: string;
  item_id: string;
  previous_stock: number | null;
  new_stock: number;
  previous_expiry: string | null;
  new_expiry: string | null;
  changed_by: string;
  movement_type: string;
  reason: string | null;
  created_at: string;
  order_id?: string | null;
  order_item_id?: string | null;
  item_name?: string;
  user_email?: string;
}

interface Order {
  id: string;
  table_id: string | null;
  customer_name: string | null;
  waiter_id: string;
  guest_count: number | null;
}

interface RestaurantTable {
  id: string;
  table_number: number;
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string | null;
}

interface AuditDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: StockHistoryEntry | null;
}

export default function AuditDetailModal({
  open,
  onOpenChange,
  entry,
}: AuditDetailModalProps) {
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [waiterProfile, setWaiterProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocale = () => {
    switch (language) {
      case 'pt-BR': return ptBR;
      case 'es': return es;
      default: return enUS;
    }
  };

  useEffect(() => {
    if (open && entry?.order_id) {
      fetchOrderDetails();
    } else {
      setOrder(null);
      setTable(null);
      setWaiterProfile(null);
    }
  }, [open, entry?.order_id]);

  const fetchOrderDetails = async () => {
    if (!entry?.order_id) return;
    
    setLoading(true);
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', entry.order_id)
        .single();

      if (orderData) {
        setOrder(orderData);

        // Fetch table if exists
        if (orderData.table_id) {
          const { data: tableData } = await supabase
            .from('restaurant_tables')
            .select('*')
            .eq('id', orderData.table_id)
            .single();
          setTable(tableData);
        }

        // Fetch waiter profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', orderData.waiter_id)
          .single();
        setWaiterProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return <ArrowDownCircle className="h-5 w-5 text-destructive" />;
      case 'entry':
        return <ArrowUpCircle className="h-5 w-5 text-success" />;
      default:
        return <RefreshCw className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return <Badge variant="destructive">{t('audit.type_withdrawal')}</Badge>;
      case 'entry':
        return <Badge className="bg-success text-success-foreground">{t('audit.type_entry')}</Badge>;
      default:
        return <Badge variant="secondary">{t('audit.type_adjustment')}</Badge>;
    }
  };

  if (!entry) return null;

  const quantityChange = entry.new_stock - (entry.previous_stock ?? 0);
  const isPositive = quantityChange >= 0;
  const formattedChange = formatQuantityChange(quantityChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getMovementIcon(entry.movement_type)}
            {t('audit.detail_title')}
          </DialogTitle>
          <DialogDescription>
            {format(parseISO(entry.created_at), 'PPpp', { locale: getLocale() })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Package className="h-5 w-5 mt-0.5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{entry.item_name}</p>
              <div className="flex items-center gap-2 mt-1">
                {getMovementBadge(entry.movement_type)}
                <span className={`font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {formattedChange}
                </span>
              </div>
            </div>
          </div>

          {/* Stock Balance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg text-center">
              <p className="text-xs text-muted-foreground">{t('audit.previous_stock')}</p>
              <p className="text-lg font-bold">{formatQuantity(entry.previous_stock)}</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <p className="text-xs text-muted-foreground">{t('audit.new_stock')}</p>
              <p className="text-lg font-bold">{formatQuantity(entry.new_stock)}</p>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('audit.changed_by')}</p>
              <p className="font-medium">{entry.user_email}</p>
            </div>
          </div>

          {/* Reason */}
          {entry.reason && (
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t('audit.col_reason')}</p>
                <p className="font-medium">{entry.reason}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Order Details (if linked to a sale) */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : order ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">
                {t('audit.sale_details')}
              </p>
              
              {/* Origin */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {order.table_id ? (
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                ) : (
                  <Store className="h-5 w-5 text-primary" />
                )}
                <div>
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
            </div>
          ) : entry.movement_type === 'withdrawal' && entry.reason?.includes(t('dining.sale_reason')) ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <p>{t('audit.order_details_unavailable')}</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
