import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Send,
  Trash2,
  Search,
  UtensilsCrossed,
  Coffee,
  IceCream,
  Wine,
  AlertTriangle,
  ChevronLeft,
  Sandwich,
  Salad,
  CupSoda,
  Pizza,
  Cherry,
  Soup,
  Beef,
  Beer,
  Milk,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id?: string | null;
  pos_category_id?: string | null;
}

interface Item {
  id: string;
  name: string;
  price: number | null;
  direct_sale: boolean | null;
  current_stock: number | null;
  unit: string;
  units_per_package: number;
  category_id: string | null;
  pos_category_id?: string | null;
}

interface PosCategory {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  isDish: boolean;
  dishId?: string;
  itemId?: string;
}

interface TechnicalSheet {
  id: string;
  dish_id: string;
  item_id: string;
  quantity_per_sale: number;
}

interface StockIssue {
  itemName: string;
  needed: number;
  available: number;
  unit: string;
}

interface POSInterfaceProps {
  onClose: () => void;
  orderId: string;
  orderLabel: string;
  tableId: string | null;
  onOrderUpdated: () => void;
  currentTotal: number;
}

// Map category names to food icons
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  lanches: Sandwich, lanche: Sandwich, hamburger: Sandwich, hamburguer: Sandwich,
  acompanhamentos: Salad, salada: Salad, saladas: Salad,
  porções: Beef, porcoes: Beef, porção: Beef,
  comidas: UtensilsCrossed, comida: UtensilsCrossed, pratos: UtensilsCrossed, prato: UtensilsCrossed,
  'pratos principais': UtensilsCrossed,
  bebidas: CupSoda, bebida: CupSoda, drinks: CupSoda,
  pizza: Pizza, pizzas: Pizza,
  açaí: Cherry, acai: Cherry,
  sobremesas: IceCream, sobremesa: IceCream, doces: IceCream,
  sorvetes: IceCream, sorvete: IceCream,
  café: Coffee, cafes: Coffee,
  sucos: CupSoda, suco: CupSoda,
  cerveja: Beer, cervejas: Beer,
  vinhos: Wine, vinho: Wine,
  milkshakes: Milk, milkshake: Milk,
  entradas: Soup, entrada: Soup,
};

function getCategoryIcon(categoryName: string): LucideIcon {
  const key = categoryName.toLowerCase().trim();
  return CATEGORY_ICON_MAP[key] || UtensilsCrossed;
}

// Vibrant color palette for category circles (CSS variable indices)
const POS_CAT_COLORS = [
  'hsl(var(--pos-cat-1))', // orange
  'hsl(var(--pos-cat-2))', // green
  'hsl(var(--pos-cat-3))', // red
  'hsl(var(--pos-cat-4))', // blue
  'hsl(var(--pos-cat-5))', // purple
  'hsl(var(--pos-cat-6))', // yellow
  'hsl(var(--pos-cat-7))', // pink
  'hsl(var(--pos-cat-8))', // teal
];

function getCatColor(index: number): string {
  return POS_CAT_COLORS[index % POS_CAT_COLORS.length];
}

export default function POSInterface({
  onClose,
  orderId,
  orderLabel,
  tableId,
  onOrderUpdated,
  currentTotal,
}: POSInterfaceProps) {
  const { user, isHost, isSuperAdmin } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const canManageCategories = isHost || isSuperAdmin;

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [directSaleItems, setDirectSaleItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [posCategories, setPosCategories] = useState<PosCategory[]>([]);
  const [technicalSheets, setTechnicalSheets] = useState<TechnicalSheet[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [stockAlertOpen, setStockAlertOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [liveTotal, setLiveTotal] = useState(currentTotal);
  const [newCatDialogOpen, setNewCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    fetchData();
    setCart([]);
  }, []);

  const fetchData = async () => {
    try {
      const [dishesRes, itemsRes, categoriesRes, posCategoriesRes, sheetsRes, orderRes] = await Promise.all([
        supabase.from('dishes').select('*').order('name'),
        supabase.from('items').select('*'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('pos_categories').select('*').order('name'),
        supabase.from('technical_sheets').select('*'),
        supabase.from('orders').select('total').eq('id', orderId).single(),
      ]);

      if (dishesRes.error) throw dishesRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (posCategoriesRes.error) throw posCategoriesRes.error;
      if (sheetsRes.error) throw sheetsRes.error;

      setDishes(dishesRes.data || []);
      setItems(itemsRes.data || []);
      setCategories(categoriesRes.data || []);
      setPosCategories(posCategoriesRes.data || []);
      setTechnicalSheets(sheetsRes.data || []);
      if (orderRes.data) {
        setLiveTotal(orderRes.data.total || 0);
      }

      const directSale = (itemsRes.data || []).filter(
        (item) => item.direct_sale && item.price && item.price > 0
      );
      setDirectSaleItems(directSale);
    } catch (error) {
      console.error('Error fetching POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user!.id)
        .single();
      const { error } = await supabase.from('pos_categories').insert({
        name: trimmed,
        restaurant_id: (profile as any)?.restaurant_id || null,
      });
      if (error) throw error;
      toast({ title: t('common.success') });
      setNewCatName('');
      setNewCatDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  // Combine dishes and direct sale items for display
  const allProducts = [
    ...dishes.map((d) => ({
      id: d.id, name: d.name, description: d.description, price: d.price,
      type: 'dish' as const, pos_category_id: d.pos_category_id,
    })),
    ...directSaleItems.map((i) => ({
      id: i.id, name: i.name, description: null, price: i.price || 0,
      type: 'item' as const, pos_category_id: i.pos_category_id,
    })),
  ];

  const productPosCategories = (() => {
    const catIds = new Set<string>();
    for (const d of dishes) { if (d.pos_category_id) catIds.add(d.pos_category_id); }
    for (const i of directSaleItems) { if (i.pos_category_id) catIds.add(i.pos_category_id); }
    return posCategories.filter(c => catIds.has(c.id));
  })();

  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedCategory) {
      if (product.pos_category_id !== selectedCategory) return false;
    }
    return matchesSearch;
  });

  const validateStockForDish = (dishId: string, quantity: number): StockIssue[] => {
    const issues: StockIssue[] = [];
    const dishSheets = technicalSheets.filter((ts) => ts.dish_id === dishId);
    for (const sheet of dishSheets) {
      const item = items.find((i) => i.id === sheet.item_id);
      if (!item) continue;
      const neededUnits = sheet.quantity_per_sale * quantity;
      const neededPackages = neededUnits / item.units_per_package;
      if ((item.current_stock || 0) < neededPackages) {
        issues.push({ itemName: item.name, needed: neededPackages, available: item.current_stock || 0, unit: item.unit });
      }
    }
    return issues;
  };

  const validateStockForItem = (itemId: string, quantity: number): StockIssue[] => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return [];
    if ((item.current_stock || 0) < quantity) {
      return [{ itemName: item.name, needed: quantity, available: item.current_stock || 0, unit: item.unit }];
    }
    return [];
  };

  const addToCart = (product: typeof allProducts[0]) => {
    let issues: StockIssue[] = [];
    const existingCartItem = cart.find(
      (c) => (product.type === 'dish' && c.dishId === product.id) || (product.type === 'item' && c.itemId === product.id)
    );
    const newQuantity = (existingCartItem?.quantity || 0) + 1;

    if (product.type === 'dish') {
      issues = validateStockForDish(product.id, newQuantity);
    } else {
      issues = validateStockForItem(product.id, newQuantity);
    }

    if (issues.length > 0) { setStockIssues(issues); setStockAlertOpen(true); return; }

    setCart((prev) => {
      const existing = prev.find(
        (c) => (product.type === 'dish' && c.dishId === product.id) || (product.type === 'item' && c.itemId === product.id)
      );
      if (existing) {
        return prev.map((c) => c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        id: `cart_${Date.now()}`, name: product.name, quantity: 1, price: product.price,
        isDish: product.type === 'dish',
        dishId: product.type === 'dish' ? product.id : undefined,
        itemId: product.type === 'item' ? product.id : undefined,
      }];
    });
  };

  const updateCartQuantity = (cartId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((c) => c.id === cartId);
      if (!item) return prev;
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) return prev.filter((c) => c.id !== cartId);
      if (delta > 0) {
        let issues: StockIssue[] = [];
        if (item.dishId) issues = validateStockForDish(item.dishId, newQuantity);
        else if (item.itemId) issues = validateStockForItem(item.itemId, newQuantity);
        if (issues.length > 0) { setStockIssues(issues); setStockAlertOpen(true); return prev; }
      }
      return prev.map((c) => c.id === cartId ? { ...c, quantity: newQuantity } : c);
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const sendToKitchen = async () => {
    if (!user || cart.length === 0) return;
    setSending(true);
    try {
      let newTotal = liveTotal;
      for (const cartItem of cart) {
        const itemStatus = cartItem.isDish ? 'pending' : 'ready';
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId, dish_id: cartItem.dishId || null, dish_name: cartItem.name,
            quantity: cartItem.quantity, unit_price: cartItem.price, status: itemStatus,
            notes: cartItem.notes || null, sent_at: new Date().toISOString(),
          })
          .select().single();
        if (itemError) throw itemError;

        if (cartItem.dishId) {
          const dishSheets = technicalSheets.filter((ts) => ts.dish_id === cartItem.dishId);
          for (const sheet of dishSheets) {
            const item = items.find((i) => i.id === sheet.item_id);
            if (!item) continue;
            const neededUnits = sheet.quantity_per_sale * cartItem.quantity;
            const neededPackages = neededUnits / item.units_per_package;
            const newStock = (item.current_stock || 0) - neededPackages;
            await supabase.from('items').update({
              current_stock: newStock, last_count_date: new Date().toISOString().split('T')[0], last_counted_by: user.id,
            }).eq('id', item.id);
            await supabase.from('stock_history').insert({
              item_id: item.id, previous_stock: item.current_stock, new_stock: newStock,
              changed_by: user.id, movement_type: 'withdrawal',
              reason: `${t('dining.sale_reason')}: ${cartItem.name} x${cartItem.quantity} - ${orderLabel}`,
              order_id: orderId, order_item_id: orderItem.id,
            });
          }
        } else if (cartItem.itemId) {
          const item = items.find((i) => i.id === cartItem.itemId);
          if (item) {
            const newStock = (item.current_stock || 0) - cartItem.quantity;
            await supabase.from('items').update({
              current_stock: newStock, last_count_date: new Date().toISOString().split('T')[0], last_counted_by: user.id,
            }).eq('id', item.id);
            await supabase.from('stock_history').insert({
              item_id: item.id, previous_stock: item.current_stock, new_stock: newStock,
              changed_by: user.id, movement_type: 'withdrawal',
              reason: `${t('pos.direct_sale')}: ${cartItem.name} x${cartItem.quantity} - ${orderLabel}`,
              order_id: orderId, order_item_id: orderItem.id,
            });
          }
        }
        newTotal += cartItem.price * cartItem.quantity;
      }

      await supabase.from('orders').update({ total: newTotal }).eq('id', orderId);
      toast({ title: t('pos.sent_to_kitchen') });
      setCart([]);
      setLiveTotal(newTotal);
      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error('Error sending to kitchen:', error);
      toast({ title: t('common.error'), description: t('pos.send_error'), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // ── Cart Content (shared between sidebar and drawer) ──
  const cartContent = (
    <>
      <ScrollArea className="flex-1">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">{t('pos.cart_empty')}</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="bg-card rounded-lg p-3 border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-sm leading-tight flex-1">{item.name}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive/80 p-0.5">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-base">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="font-bold text-base">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Cart Footer */}
      <div className="p-4 border-t bg-card space-y-3">
        {liveTotal > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('pos.current_total')}</span>
            <span>{formatCurrency(liveTotal)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span>{t('pos.subtotal')}</span>
          <span className="font-semibold">{formatCurrency(cartTotal)}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between text-xl font-bold text-primary">
          <span>{t('pos.new_total')}</span>
          <span>{formatCurrency(liveTotal + cartTotal)}</span>
        </div>
        <Button
          className="w-full h-14 text-base font-bold rounded-xl shadow-lg"
          size="lg"
          disabled={cart.length === 0 || sending}
          onClick={sendToKitchen}
        >
          <Send className="mr-2 h-5 w-5" />
          {sending ? t('pos.sending') : t('pos.send_to_kitchen')}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Full-page POS layout */}
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* ── Header ── */}
        <div className="px-4 py-3 border-b shrink-0 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">{orderLabel}</h1>
                <p className="text-xs text-muted-foreground">{t('pos.add_items_desc')}</p>
              </div>
            </div>

            {isMobile ? (
              <Button
                variant="default"
                size="sm"
                className="relative rounded-full px-3"
                onClick={() => setCartDrawerOpen(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                {cartItemCount > 0 && (
                  <span className="font-bold">{cartItemCount}</span>
                )}
              </Button>
            ) : (
              <Badge variant="outline" className="text-base px-4 py-2 font-bold">
                {t('pos.current_total')}: {formatCurrency(liveTotal)}
              </Badge>
            )}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Products Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ── Category Bar (Reference-faithful design) ── */}
            <div className="shrink-0 bg-card border-b">
              <div className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-none">
                {/* "Todos" button */}
                <button
                  className="flex flex-col items-center gap-2 min-w-[64px] shrink-0 group"
                  onClick={() => setSelectedCategory(null)}
                >
                  <div
                    className={cn(
                      "h-16 w-16 rounded-full flex items-center justify-center transition-all shadow-md",
                      selectedCategory === null
                        ? "ring-3 ring-primary ring-offset-2 ring-offset-background scale-110"
                        : "group-hover:scale-105"
                    )}
                    style={{ backgroundColor: 'hsl(var(--secondary))' }}
                  >
                    <Layers className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wide leading-tight text-center",
                    selectedCategory === null ? "text-primary" : "text-muted-foreground"
                  )}>
                    {t('pos.all')}
                  </span>
                </button>

                {productPosCategories.map((cat, index) => {
                  const Icon = getCategoryIcon(cat.name);
                  const isActive = selectedCategory === cat.id;
                  const color = getCatColor(index);
                  return (
                    <button
                      key={cat.id}
                      className="flex flex-col items-center gap-2 min-w-[64px] shrink-0 group"
                      onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                    >
                      <div
                        className={cn(
                          "h-16 w-16 rounded-full flex items-center justify-center transition-all shadow-md",
                          isActive
                            ? "ring-3 ring-primary ring-offset-2 ring-offset-background scale-110"
                            : "group-hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-wide leading-tight text-center max-w-[72px] line-clamp-1",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}

                {/* Add Category button */}
                {canManageCategories && (
                  <button
                    className="flex flex-col items-center gap-2 min-w-[64px] shrink-0 group"
                    onClick={() => setNewCatDialogOpen(true)}
                  >
                    <div className="h-16 w-16 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/40 hover:border-primary transition-colors group-hover:scale-105">
                      <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t('common.add') || 'Adicionar'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Search Bar ── */}
            <div className="px-4 py-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('pos.search_products')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* ── Products Grid ── */}
            <ScrollArea className="flex-1 px-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">{t('pos.no_products')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map((product) => {
                    const ProductIcon = product.type === 'dish' ? UtensilsCrossed : Coffee;
                    // Find category color for product
                    const catIdx = productPosCategories.findIndex(c => c.id === product.pos_category_id);
                    const iconBgColor = catIdx >= 0 ? getCatColor(catIdx) : 'hsl(var(--muted))';

                    return (
                      <button
                        key={`${product.type}-${product.id}`}
                        className="bg-card rounded-xl border shadow-sm hover:shadow-md active:scale-95 transition-all text-left overflow-hidden group"
                        onClick={() => addToCart(product)}
                      >
                        {/* Product image/icon area */}
                        <div
                          className="w-full aspect-[4/3] flex items-center justify-center rounded-t-xl"
                          style={{ backgroundColor: iconBgColor + '22' }}
                        >
                          <div
                            className="h-16 w-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: iconBgColor }}
                          >
                            <ProductIcon className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        {/* Product info */}
                        <div className="p-3">
                          <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1">
                            {product.name}
                          </h3>
                          <p className="font-bold text-base text-primary">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ── Desktop: Cart Sidebar ── */}
          {!isMobile && (
            <div className="w-[340px] border-l flex flex-col bg-background">
              <div className="p-4 border-b bg-card">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">{t('pos.cart')}</h3>
                  {cartItemCount > 0 && (
                    <Badge className="ml-auto">{cartItemCount}</Badge>
                  )}
                </div>
              </div>
              {cartContent}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Cart Drawer */}
      {isMobile && (
        <Drawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t('pos.cart')}
                {cartItemCount > 0 && <Badge>{cartItemCount}</Badge>}
              </DrawerTitle>
              <DrawerDescription>
                {t('pos.current_total')}: {formatCurrency(liveTotal)}
              </DrawerDescription>
            </DrawerHeader>
            {cartContent}
          </DrawerContent>
        </Drawer>
      )}

      {/* Stock Alert */}
      <AlertDialog open={stockAlertOpen} onOpenChange={setStockAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('dining.stock_insufficient')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {stockIssues.map((issue, idx) => (
                <p key={idx}>
                  <strong>{issue.itemName}:</strong> {t('dining.needed')}{' '}
                  {issue.needed.toFixed(2)} {issue.unit}, {t('dining.available')}{' '}
                  {issue.available.toFixed(2)} {issue.unit}
                </p>
              ))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setStockAlertOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Category Dialog */}
      <Dialog open={newCatDialogOpen} onOpenChange={setNewCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pos.add_category') || 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('common.name') || 'Nome'}</Label>
              <Input
                placeholder="Ex: Bebidas, Lanches..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCatDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addCategory} disabled={!newCatName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add') || 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
