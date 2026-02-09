import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download, ChevronRight } from 'lucide-react';
import { formatQuantity } from '@/lib/formatNumber';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClosingHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClosingRecord {
  id: string;
  closed_at: string;
  total_revenue: number;
  total_orders: number;
  sales_by_waiter: unknown;
  expired_items: unknown;
  consumed_products: unknown;
}

export function ClosingHistoryModal({ open, onOpenChange }: ClosingHistoryModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [closings, setClosings] = useState<ClosingRecord[]>([]);
  const [selectedClosing, setSelectedClosing] = useState<ClosingRecord | null>(null);

  useEffect(() => {
    if (open) {
      loadClosings();
    } else {
      setSelectedClosing(null);
    }
  }, [open]);

  const loadClosings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bar_closings')
        .select('id, closed_at, total_revenue, total_orders, sales_by_waiter, expired_items, consumed_products')
        .order('closed_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setClosings((data || []) as ClosingRecord[]);
    } catch (error) {
      console.error('Error loading closings:', error);
      toast({
        title: t('common.error'),
        description: t('close_bar.load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSalesArray = (data: unknown): any[] => {
    if (Array.isArray(data)) return data;
    return [];
  };

  const getExpiredArray = (data: unknown): any[] => {
    if (Array.isArray(data)) return data;
    return [];
  };

  const getConsumedArray = (data: unknown): any[] => {
    if (Array.isArray(data)) return data;
    return [];
  };

  const handleExportPDF = (closing: ClosingRecord) => {
    const salesByWaiter = getSalesArray(closing.sales_by_waiter);
    const expiredItems = getExpiredArray(closing.expired_items);
    const consumedProducts = getConsumedArray(closing.consumed_products);

    const content = `
=== ${t('close_bar.report_title')} ===
${t('close_bar.date')}: ${format(new Date(closing.closed_at), 'dd/MM/yyyy HH:mm')}

${t('close_bar.financial_summary')}
─────────────────────────
${t('close_bar.total_revenue')}: ${formatCurrency(closing.total_revenue)}
${t('close_bar.total_orders')}: ${closing.total_orders}

${t('close_bar.sales_by_waiter')}
─────────────────────────
${salesByWaiter.map((w: any) => 
  `${w.waiter_name}: ${formatCurrency(w.total)} (${w.orders_count} ${t('inventory.items')})`
).join('\n') || t('close_bar.no_sales')}

${t('close_bar.expired_items')}
─────────────────────────
${expiredItems.map((i: any) => 
  `${i.name}: ${formatQuantity(i.quantity)} (${t('table.expiry')}: ${i.expiry_date})`
).join('\n') || t('close_bar.no_expired')}

${t('close_bar.consumed_products')}
─────────────────────────
${consumedProducts.map((p: any) => 
  `${p.item_name}: ${formatQuantity(p.total_consumed)} ${p.unit}`
).join('\n') || t('close_bar.no_consumption')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento-${format(new Date(closing.closed_at), 'yyyy-MM-dd-HHmm')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('close_bar.history_title')}
          </DialogTitle>
          <DialogDescription>
            {t('close_bar.history_desc')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : selectedClosing ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedClosing(null)}>
              ← {t('close_bar.back_to_list')}
            </Button>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">
                  {format(new Date(selectedClosing.closed_at), 'dd/MM/yyyy HH:mm')}
                </h3>
                <Button variant="outline" size="sm" onClick={() => handleExportPDF(selectedClosing)}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('close_bar.export_pdf')}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">{t('close_bar.total_revenue')}</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(selectedClosing.total_revenue)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">{t('close_bar.total_orders')}</p>
                  <p className="text-xl font-bold">{selectedClosing.total_orders}</p>
                </div>
              </div>

              {getSalesArray(selectedClosing.sales_by_waiter).length > 0 && (
                <div className="rounded-lg border p-3">
                  <h4 className="font-medium mb-2">{t('close_bar.sales_by_waiter')}</h4>
                  <div className="space-y-1">
                    {getSalesArray(selectedClosing.sales_by_waiter).map((w: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{w.waiter_name}</span>
                        <span>{formatCurrency(w.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : closings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <p>{t('close_bar.no_history')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {closings.map((closing) => (
                <button
                  key={closing.id}
                  onClick={() => setSelectedClosing(closing)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(closing.closed_at), 'dd/MM/yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {closing.total_orders} {t('inventory.items')} • {formatCurrency(closing.total_revenue)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
