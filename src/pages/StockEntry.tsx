import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRealtimeItems } from '@/hooks/useRealtimeItems';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StockWithdrawalModal } from '@/components/StockWithdrawalModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Save, RotateCcw, Package, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, format } from 'date-fns';
import { CategoryAccordion } from '@/components/stock-entry/CategoryAccordion';

interface Category {
  id: string;
  name: string;
}

interface Item {
  id: string;
  category_id: string;
  name: string;
  unit: string;
  sub_unit: string | null;
  recipe_unit: string | null;
  min_stock: number;
  current_stock: number;
  expiry_date: string | null;
  last_count_date: string | null;
}

interface EditedItem {
  id: string;
  current_stock: number;
  expiry_date: string | null;
  original_stock: number;
  original_expiry: string | null;
}

export default function StockEntry() {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [rawItems, setRawItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editedItems, setEditedItems] = useState<Map<string, EditedItem>>(new Map());
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [selectedItemForWithdrawal, setSelectedItemForWithdrawal] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Use realtime items hook
  const { items, setItems } = useRealtimeItems(rawItems);

  // Read filter from URL on mount
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setActiveFilter(filter);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('items').select('*').order('name'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setCategories(categoriesRes.data || []);
      setRawItems(itemsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalComplete = useCallback((itemId: string, newStock: number) => {
    // Optimistically update the local state
    setItems(current =>
      current.map(item =>
        item.id === itemId ? { ...item, current_stock: newStock } : item
      )
    );
    setSelectedItemForWithdrawal(undefined);
  }, [setItems]);

  const openWithdrawalForItem = (itemId: string) => {
    setSelectedItemForWithdrawal(itemId);
    setWithdrawalModalOpen(true);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setSearchParams({});
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply URL filter
    let matchesUrlFilter = true;
    if (activeFilter === 'low-stock') {
      matchesUrlFilter = item.current_stock < item.min_stock;
    } else if (activeFilter === 'expiring') {
      if (item.expiry_date) {
        const daysUntilExpiry = differenceInDays(parseISO(item.expiry_date), new Date());
        matchesUrlFilter = daysUntilExpiry <= 1 && daysUntilExpiry >= 0;
      } else {
        matchesUrlFilter = false;
      }
    }
    
    return matchesCategory && matchesSearch && matchesUrlFilter;
  });

  const handleStockChange = (itemId: string, value: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newStock = parseFloat(value) || 0;
    
    // Security: Staff users can only INCREMENT stock, not decrease
    // Any stock reduction must go through the official withdrawal flow
    if (!isAdmin && newStock < item.current_stock) {
      return; // Silently block - staff cannot decrease stock via input
    }
    
    const newEdited = new Map(editedItems);

    if (!newEdited.has(itemId)) {
      newEdited.set(itemId, {
        id: itemId,
        current_stock: newStock,
        expiry_date: item.expiry_date,
        original_stock: item.current_stock,
        original_expiry: item.expiry_date,
      });
    } else {
      const existing = newEdited.get(itemId)!;
      newEdited.set(itemId, { ...existing, current_stock: newStock });
    }

    setEditedItems(newEdited);
  };

  const handleExpiryChange = (itemId: string, date: Date | undefined) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newExpiry = date ? format(date, 'yyyy-MM-dd') : null;
    const newEdited = new Map(editedItems);

    if (!newEdited.has(itemId)) {
      newEdited.set(itemId, {
        id: itemId,
        current_stock: item.current_stock,
        expiry_date: newExpiry,
        original_stock: item.current_stock,
        original_expiry: item.expiry_date,
      });
    } else {
      const existing = newEdited.get(itemId)!;
      newEdited.set(itemId, { ...existing, expiry_date: newExpiry });
    }

    setEditedItems(newEdited);
  };

  const getDisplayStock = (item: Item) => {
    const edited = editedItems.get(item.id);
    return edited !== undefined ? edited.current_stock : item.current_stock;
  };

  const getDisplayExpiry = (item: Item) => {
    const edited = editedItems.get(item.id);
    return edited !== undefined ? edited.expiry_date : item.expiry_date;
  };

  const handleSave = async () => {
    if (editedItems.size === 0) {
      toast({ title: t('stock_entry.no_changes') });
      return;
    }

    setSaving(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    let updatedCount = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;

    try {
      for (const [itemId, edited] of editedItems) {
        const item = items.find((i) => i.id === itemId);
        if (!item) continue;

        // Security check: Staff users cannot decrease stock via this route
        // They must use the official withdrawal flow
        if (!isAdmin && edited.current_stock < edited.original_stock) {
          toast({
            title: t('common.error'),
            description: t('stock_entry.staff_no_decrease'),
            variant: 'destructive',
          });
          continue;
        }

        // Determine movement type based on stock change
        const stockDiff = edited.current_stock - edited.original_stock;
        const movementType = stockDiff > 0 ? 'entry' : stockDiff < 0 ? 'adjustment' : 'adjustment';

        const { error } = await supabase
          .from('items')
          .update({
            current_stock: edited.current_stock,
            expiry_date: edited.expiry_date,
            last_count_date: today,
            last_counted_by: user?.id,
          })
          .eq('id', itemId);

        if (error) throw error;

        await supabase.from('stock_history').insert({
          item_id: itemId,
          previous_stock: edited.original_stock,
          new_stock: edited.current_stock,
          previous_expiry: edited.original_expiry,
          new_expiry: edited.expiry_date,
          changed_by: user?.id,
          movement_type: movementType,
          reason: stockDiff > 0 ? t('stock_entry.entry_reason') : t('stock_entry.adjustment_reason'),
        });

        updatedCount++;

        if (edited.current_stock < item.min_stock) {
          lowStockCount++;
        }
        if (edited.expiry_date) {
          const daysUntil = differenceInDays(parseISO(edited.expiry_date), new Date());
          if (daysUntil <= 1 && daysUntil >= 0) {
            expiringSoonCount++;
          }
        }
      }

      toast({
        title: t('stock_entry.saved'),
        description: `${updatedCount} ${updatedCount === 1 ? t('stock_entry.item_updated') : t('stock_entry.items_updated')}. ${lowStockCount > 0 ? `${lowStockCount} ${t('stock_entry.below_min')}. ` : ''}${expiringSoonCount > 0 ? `${expiringSoonCount} ${t('stock_entry.near_expiry')}.` : ''}`,
      });

      setEditedItems(new Map());
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (editedItems.size === 0) return;
    if (!confirm(t('stock_entry.discard_confirm'))) return;
    setEditedItems(new Map());
  };

  const getRowClassName = (item: Item) => {
    const expiry = getDisplayExpiry(item);
    if (expiry) {
      const daysUntilExpiry = differenceInDays(parseISO(expiry), new Date());
      if (daysUntilExpiry <= 1 && daysUntilExpiry >= 0) {
        return 'stock-danger';
      }
    }
    return '';
  };

  const getStockCellClassName = (item: Item) => {
    const stock = getDisplayStock(item);
    if (stock < item.min_stock) {
      return 'stock-warning';
    }
    return '';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{t('stock_entry.title')}</h1>
            <p className="mt-1 text-muted-foreground">
              {t('stock_entry.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={() => setWithdrawalModalOpen(true)}
            >
              <Minus className="mr-2 h-4 w-4" />
              {t('withdrawal.button')}
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={editedItems.size === 0 || saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('stock_entry.discard')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={editedItems.size === 0 || saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {t('stock_entry.save_changes')}
              {editedItems.size > 0 && (
                <span className="ml-2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                  {editedItems.size}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Active Filter Badge */}
        {activeFilter && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {activeFilter === 'low-stock' 
                    ? t('stock_entry.filter_low_stock') 
                    : t('stock_entry.filter_expiring')}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({filteredItems.length} {filteredItems.length === 1 ? t('inventory.item') : t('inventory.items')})
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilter}>
                {t('stock_entry.clear_filter')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('stock_entry.all_categories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('stock_entry.all_categories')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('stock_entry.search_product')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Restriction Notice */}
        {!isAdmin && (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('stock_entry.staff_restriction_notice')}
            </AlertDescription>
          </Alert>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-danger-light border border-danger" />
            <span className="text-muted-foreground">{t('stock_entry.expiring_legend')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-warning-light border border-warning" />
            <span className="text-muted-foreground">{t('stock_entry.low_stock_legend')}</span>
          </div>
        </div>

        {/* Category Accordions */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">{t('stock_entry.no_items')}</h3>
              <p className="mt-2 text-center text-muted-foreground">
                {items.length === 0
                  ? t('stock_entry.register_first')
                  : t('stock_entry.adjust_filters')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {categories
              .filter((cat) => filteredItems.some((item) => item.category_id === cat.id))
              .map((cat) => (
                <CategoryAccordion
                   key={cat.id}
                   categoryName={cat.name}
                   items={filteredItems.filter((item) => item.category_id === cat.id)}
                   editedItems={editedItems}
                   onStockChange={handleStockChange}
                   onExpiryChange={handleExpiryChange}
                   getDisplayStock={getDisplayStock}
                   getDisplayExpiry={getDisplayExpiry}
                 />
               ))}
               {/* Items without category */}
               {filteredItems.some((item) => !item.category_id || !categories.find((c) => c.id === item.category_id)) && (
                 <CategoryAccordion
                   categoryName={t('stock_entry.uncategorized') || 'Sem categoria'}
                   items={filteredItems.filter((item) => !item.category_id || !categories.find((c) => c.id === item.category_id))}
                   editedItems={editedItems}
                   onStockChange={handleStockChange}
                   onExpiryChange={handleExpiryChange}
                   getDisplayStock={getDisplayStock}
                   getDisplayExpiry={getDisplayExpiry}
                 />
               )}
          </div>
        )}

        {/* Stock Withdrawal Modal */}
        <StockWithdrawalModal
          open={withdrawalModalOpen}
          onOpenChange={setWithdrawalModalOpen}
          items={items}
          categories={categories}
          onWithdrawalComplete={handleWithdrawalComplete}
          preselectedItemId={selectedItemForWithdrawal}
        />
      </div>
    </DashboardLayout>
  );
}
