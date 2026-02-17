import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, FileText, Download, MapPin, ClipboardList, Zap } from 'lucide-react';
import { formatQuantity } from '@/lib/formatNumber';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import OrderDetailModal from './OrderDetailModal';

interface PendingOrder {
  id: string;
  table_id: string | null;
  table_number: number | null;
  customer_name: string | null;
  total: number;
  waiter_id: string;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  guest_count: number | null;
}

interface CloseBarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionClosed?: () => void;
}

interface SaleByWaiter {
  waiter_id: string;
  waiter_name: string;
  total: number;
  orders_count: number;
}

interface ExpiredItem {
  id: string;
  name: string;
  expiry_date: string;
  quantity: number;
}

interface ConsumedProduct {
  item_id: string;
  item_name: string;
  total_consumed: number;
  unit: string;
}

interface ClosingReport {
  total_revenue: number;
  total_orders: number;
  sales_by_waiter: SaleByWaiter[];
  expired_items: ExpiredItem[];
  consumed_products: ConsumedProduct[];
}

export function CloseBarModal({ open, onOpenChange, onSessionClosed }: CloseBarModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [report, setReport] = useState<ClosingReport | null>(null);
  const [step, setStep] = useState<'check' | 'preview' | 'done'>('check');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [resolveOrder, setResolveOrder] = useState<{ id: string; table_id: string | null; status: string; waiter_id: string; opened_at: string | null; closed_at: string | null; created_at: string | null; total: number | null; guest_count: number | null; customer_name: string | null } | null>(null);

  useEffect(() => {
    if (open) {
      checkCanClose();
    } else {
      setStep('check');
      setReport(null);
      setPendingOrders([]);
      setResolveOrder(null);
    }
  }, [open]);

  const checkCanClose = async () => {
    setChecking(true);
    try {
      // Check for active orders with table info
      const { data: activeOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, table_id, customer_name, total, status, waiter_id, opened_at, closed_at, created_at, guest_count')
        .eq('status', 'open');

      if (ordersError) throw ordersError;

      // Get table numbers for active orders
      const pending: PendingOrder[] = [];
      if (activeOrders && activeOrders.length > 0) {
        const tableIds = activeOrders.filter(o => o.table_id).map(o => o.table_id!);
        let tableMap: Record<string, number> = {};
        if (tableIds.length > 0) {
          const { data: tables } = await supabase
            .from('restaurant_tables')
            .select('id, table_number')
            .in('id', tableIds);
          tableMap = Object.fromEntries((tables || []).map(t => [t.id, t.table_number]));
        }
        for (const order of activeOrders) {
          pending.push({
            id: order.id,
            table_id: order.table_id,
            table_number: order.table_id ? (tableMap[order.table_id] ?? null) : null,
            customer_name: order.customer_name,
            total: Number(order.total) || 0,
            waiter_id: order.waiter_id,
            opened_at: order.opened_at,
            closed_at: order.closed_at,
            created_at: order.created_at,
            guest_count: order.guest_count,
          });
        }
      }

      setPendingOrders(pending);

      if (pending.length > 0) {
        setCanClose(false);
        if (pending.length === 1) {
          const p = pending[0];
          const label = p.table_number ? `${t('dining.table')} ${p.table_number}` : (p.customer_name || t('audit.unknown_user'));
          setBlockReason(t('close_bar.single_pending').replace('{label}', label));
        } else {
          setBlockReason(t('close_bar.multiple_pending').replace('{count}', String(pending.length)));
        }
      } else {
        setCanClose(true);
        setBlockReason('');
        await generateReport();
      }
    } catch (error) {
      console.error('Error checking close status:', error);
      toast({
        title: t('common.error'),
        description: t('close_bar.check_error'),
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const generateReport = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's finished orders
      const { data: finishedOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          waiter_id,
          closed_at
        `)
        .eq('status', 'closed')
        .gte('closed_at', today.toISOString());

      if (ordersError) throw ordersError;

      // Calculate sales by waiter
      const waiterSales: Record<string, { total: number; count: number }> = {};
      let totalRevenue = 0;

      for (const order of finishedOrders || []) {
        totalRevenue += Number(order.total) || 0;
        if (!waiterSales[order.waiter_id]) {
          waiterSales[order.waiter_id] = { total: 0, count: 0 };
        }
        waiterSales[order.waiter_id].total += Number(order.total) || 0;
        waiterSales[order.waiter_id].count += 1;
      }

      // Get waiter profiles
      const waiterIds = Object.keys(waiterSales);
      let salesByWaiter: SaleByWaiter[] = [];

      if (waiterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', waiterIds);

        salesByWaiter = waiterIds.map(waiterId => ({
          waiter_id: waiterId,
          waiter_name: (profiles as any[])?.find((p: any) => p.id === waiterId)?.full_name || t('audit.unknown_user'),
          total: waiterSales[waiterId].total,
          orders_count: waiterSales[waiterId].count,
        }));
      }

      // Get expired items
      const { data: expiredItems, error: expiredError } = await supabase
        .from('items')
        .select('id, name, expiry_date, current_stock')
        .lt('expiry_date', new Date().toISOString().split('T')[0])
        .gt('current_stock', 0);

      if (expiredError) throw expiredError;

      // Get consumed products from today's closed order items
      const closedOrderIds = (finishedOrders || []).map(o => o.id);
      let consumedProducts: ConsumedProduct[] = [];

      if (closedOrderIds.length > 0) {
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('dish_name, quantity, unit_price')
          .in('order_id', closedOrderIds);

        if (itemsError) throw itemsError;

        const consumedMap: Record<string, { total_qty: number; total_value: number }> = {};
        for (const item of orderItems || []) {
          const key = item.dish_name;
          if (!consumedMap[key]) {
            consumedMap[key] = { total_qty: 0, total_value: 0 };
          }
          consumedMap[key].total_qty += item.quantity;
          consumedMap[key].total_value += item.quantity * item.unit_price;
        }

        consumedProducts = Object.entries(consumedMap).map(([name, data]) => ({
          item_id: name,
          item_name: name,
          total_consumed: data.total_qty,
          unit: formatCurrency(data.total_value),
        }));
      }

      setReport({
        total_revenue: totalRevenue,
        total_orders: finishedOrders?.length || 0,
        sales_by_waiter: salesByWaiter,
        expired_items: (expiredItems || []).map(item => ({
          id: item.id,
          name: item.name,
          expiry_date: item.expiry_date || '',
          quantity: item.current_stock || 0,
        })),
        consumed_products: consumedProducts,
      });

      setStep('preview');
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: t('common.error'),
        description: t('close_bar.report_error'),
        variant: 'destructive',
      });
    }
  };

  const handleCloseBar = async () => {
    if (!report || !user) return;

    setLoading(true);
    try {
      // Get today's orders summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          table_id,
          customer_name,
          total,
          waiter_id,
          opened_at,
          closed_at,
          order_items (dish_name, quantity, unit_price)
        `)
        .eq('status', 'closed')
        .gte('closed_at', today.toISOString());

      // Save closing report to database
      const { error: insertError } = await supabase
        .from('bar_closings')
        .insert([{
          closed_by: user.id,
          total_revenue: report.total_revenue,
          total_orders: report.total_orders,
          sales_by_waiter: JSON.parse(JSON.stringify(report.sales_by_waiter)),
          expired_items: JSON.parse(JSON.stringify(report.expired_items)),
          consumed_products: JSON.parse(JSON.stringify(report.consumed_products)),
          orders_summary: JSON.parse(JSON.stringify(ordersData || [])),
        }]);

      if (insertError) throw insertError;

      setStep('done');
      
      // Close the active session if callback provided
      if (onSessionClosed) {
        onSessionClosed();
      }

      toast({
        title: t('close_bar.success'),
        description: t('close_bar.success_desc'),
      });
    } catch (error) {
      console.error('Error closing bar:', error);
      toast({
        title: t('common.error'),
        description: t('close_bar.close_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!report) return;

    const content = `
=== ${t('close_bar.report_title')} ===
${t('close_bar.date')}: ${format(new Date(), 'dd/MM/yyyy HH:mm')}

${t('close_bar.financial_summary')}
─────────────────────────
${t('close_bar.total_revenue')}: ${formatCurrency(report.total_revenue)}
${t('close_bar.total_orders')}: ${report.total_orders}

${t('close_bar.sales_by_waiter')}
─────────────────────────
${report.sales_by_waiter.map(w => 
  `${w.waiter_name}: ${formatCurrency(w.total)} (${w.orders_count} ${t('inventory.items')})`
).join('\n') || t('close_bar.no_sales')}

${t('close_bar.expired_items')}
─────────────────────────
${report.expired_items.map(i => 
  `${i.name}: ${formatQuantity(i.quantity)} (${t('table.expiry')}: ${i.expiry_date})`
).join('\n') || t('close_bar.no_expired')}

${t('close_bar.consumed_products')}
─────────────────────────
${report.consumed_products.map(p => 
  `${p.item_name} x${formatQuantity(p.total_consumed)} — ${p.unit}`
).join('\n') || t('close_bar.no_consumption')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('close_bar.title')}
          </DialogTitle>
          <DialogDescription>
            {step === 'check' && t('close_bar.checking')}
            {step === 'preview' && t('close_bar.preview_desc')}
            {step === 'done' && t('close_bar.done_desc')}
          </DialogDescription>
        </DialogHeader>

        {checking && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!checking && !canClose && step === 'check' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-center text-destructive font-medium">
              {blockReason}
            </p>

            {/* Pending orders list */}
            {pendingOrders.length > 1 && (
              <div className="w-full rounded-lg border p-3 space-y-2">
                {pendingOrders.map((p) => {
                  const label = p.table_number ? `${t('dining.table')} ${p.table_number}` : (p.customer_name || '—');
                  return (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <span>{label}</span>
                      <span className="text-muted-foreground">{formatCurrency(p.total)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {pendingOrders.length === 1 && (
                <Button onClick={() => {
                  const p = pendingOrders[0];
                  setResolveOrder({
                    id: p.id,
                    table_id: p.table_id,
                    status: 'open',
                    waiter_id: p.waiter_id,
                    opened_at: p.opened_at,
                    closed_at: p.closed_at,
                    created_at: p.created_at,
                    total: p.total,
                    guest_count: p.guest_count,
                    customer_name: p.customer_name,
                  });
                }}>
                  <Zap className="h-4 w-4 mr-2" />
                  {t('close_bar.resolve_now')}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/salon');
                }}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {t('close_bar.go_to_salon')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/');
                }}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                {t('close_bar.view_active_orders')}
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && report && (
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">{t('close_bar.financial_summary')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('close_bar.total_revenue')}</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(report.total_revenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('close_bar.total_orders')}</p>
                  <p className="text-2xl font-bold">{report.total_orders}</p>
                </div>
              </div>
            </div>

            {/* Sales by Waiter */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">{t('close_bar.sales_by_waiter')}</h3>
              {report.sales_by_waiter.length > 0 ? (
                <div className="space-y-2">
                  {report.sales_by_waiter.map((waiter) => (
                    <div key={waiter.waiter_id} className="flex justify-between items-center">
                      <span>{waiter.waiter_name}</span>
                      <span className="font-medium">
                        {formatCurrency(waiter.total)} ({waiter.orders_count} {t('inventory.items')})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('close_bar.no_sales')}</p>
              )}
            </div>

            {/* Expired Items */}
            {report.expired_items.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <h3 className="font-semibold mb-3 text-destructive">{t('close_bar.expired_items')}</h3>
                <div className="space-y-2">
                  {report.expired_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span>{item.name}</span>
                      <span>{formatQuantity(item.quantity)} ({item.expiry_date})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consumed Products */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">{t('close_bar.consumed_products')}</h3>
              {report.consumed_products.length > 0 ? (
                <div className="space-y-2">
                  {report.consumed_products.map((product) => (
                    <div key={product.item_id} className="flex justify-between items-center text-sm">
                      <span>{product.item_name} <span className="text-muted-foreground">x{formatQuantity(product.total_consumed)}</span></span>
                      <span className="font-medium">{product.unit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('close_bar.no_consumption')}</p>
              )}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center font-medium">{t('close_bar.done_message')}</p>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              {t('close_bar.export_pdf')}
            </Button>
          </div>
        )}

        <DialogFooter>
          {step === 'check' && !checking && !canClose && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCloseBar} disabled={loading} variant="destructive">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('close_bar.confirm')
                )}
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Inline OrderDetailModal for resolving a single pending order */}
      {resolveOrder && (
        <OrderDetailModal
          order={resolveOrder}
          open={!!resolveOrder}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setResolveOrder(null);
              checkCanClose();
            }
          }}
          onOrderClosed={() => {
            setResolveOrder(null);
            checkCanClose();
          }}
        />
      )}
    </Dialog>
  );
}
