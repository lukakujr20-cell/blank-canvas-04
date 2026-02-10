import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  ChevronRight,
  Printer,
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
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderLabel: string;
  tableId: string | null;
  onOrderUpdated: () => void;
  existingItems: Array<{
    id: string;
    dish_name: string;
    quantity: number;
    unit_price: number;
    notes: string | null;
  }>;
  currentTotal: number;
}

export default function POSInterface({
  open,
  onClose,
  orderId,
  orderLabel,
  tableId,
  onOrderUpdated,
  existingItems,
  currentTotal,
}: POSInterfaceProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  useEffect(() => {
    if (open) {
      fetchData();
      setCart([]);
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [dishesRes, itemsRes, categoriesRes, posCategoriesRes, sheetsRes] = await Promise.all([
        supabase.from('dishes').select('*').order('name'),
        supabase.from('items').select('*'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('pos_categories').select('*').order('name'),
        supabase.from('technical_sheets').select('*'),
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

  // Combine dishes and direct sale items for display
  const allProducts = [
    ...dishes.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      price: d.price,
      type: 'dish' as const,
      pos_category_id: d.pos_category_id,
    })),
    ...directSaleItems.map((i) => ({
      id: i.id,
      name: i.name,
      description: null,
      price: i.price || 0,
      type: 'item' as const,
      pos_category_id: i.pos_category_id,
    })),
  ];

  // Get POS categories that have products
  const productPosCategories = (() => {
    const catIds = new Set<string>();
    for (const d of dishes) {
      if (d.pos_category_id) catIds.add(d.pos_category_id);
    }
    for (const i of directSaleItems) {
      if (i.pos_category_id) catIds.add(i.pos_category_id);
    }
    return posCategories.filter(c => catIds.has(c.id));
  })();

  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());

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
        issues.push({
          itemName: item.name,
          needed: neededPackages,
          available: item.current_stock || 0,
          unit: item.unit,
        });
      }
    }

    return issues;
  };

  const validateStockForItem = (itemId: string, quantity: number): StockIssue[] => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return [];

    if ((item.current_stock || 0) < quantity) {
      return [{
        itemName: item.name,
        needed: quantity,
        available: item.current_stock || 0,
        unit: item.unit,
      }];
    }

    return [];
  };

  const addToCart = (product: typeof allProducts[0]) => {
    let issues: StockIssue[] = [];
    const existingCartItem = cart.find(
      (c) =>
        (product.type === 'dish' && c.dishId === product.id) ||
        (product.type === 'item' && c.itemId === product.id)
    );
    const newQuantity = (existingCartItem?.quantity || 0) + 1;

    if (product.type === 'dish') {
      issues = validateStockForDish(product.id, newQuantity);
    } else {
      issues = validateStockForItem(product.id, newQuantity);
    }

    if (issues.length > 0) {
      setStockIssues(issues);
      setStockAlertOpen(true);
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (c) =>
          (product.type === 'dish' && c.dishId === product.id) ||
          (product.type === 'item' && c.itemId === product.id)
      );

      if (existing) {
        return prev.map((c) =>
          c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }

      return [
        ...prev,
        {
          id: `cart_${Date.now()}`,
          name: product.name,
          quantity: 1,
          price: product.price,
          isDish: product.type === 'dish',
          dishId: product.type === 'dish' ? product.id : undefined,
          itemId: product.type === 'item' ? product.id : undefined,
        },
      ];
    });
  };

  const updateCartQuantity = (cartId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((c) => c.id === cartId);
      if (!item) return prev;

      const newQuantity = item.quantity + delta;

      if (newQuantity <= 0) {
        return prev.filter((c) => c.id !== cartId);
      }

      if (delta > 0) {
        let issues: StockIssue[] = [];
        if (item.dishId) {
          issues = validateStockForDish(item.dishId, newQuantity);
        } else if (item.itemId) {
          issues = validateStockForItem(item.itemId, newQuantity);
        }

        if (issues.length > 0) {
          setStockIssues(issues);
          setStockAlertOpen(true);
          return prev;
        }
      }

      return prev.map((c) =>
        c.id === cartId ? { ...c, quantity: newQuantity } : c
      );
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const sendToKitchen = async () => {
    if (!user || cart.length === 0) return;

    setSending(true);

    try {
      let newTotal = currentTotal;

      for (const cartItem of cart) {
        const itemStatus = cartItem.isDish ? 'pending' : 'ready';

        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            dish_id: cartItem.dishId || null,
            dish_name: cartItem.name,
            quantity: cartItem.quantity,
            unit_price: cartItem.price,
            status: itemStatus,
            notes: cartItem.notes || null,
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (itemError) throw itemError;

        if (cartItem.dishId) {
          const dishSheets = technicalSheets.filter(
            (ts) => ts.dish_id === cartItem.dishId
          );

          for (const sheet of dishSheets) {
            const item = items.find((i) => i.id === sheet.item_id);
            if (!item) continue;

            const neededUnits = sheet.quantity_per_sale * cartItem.quantity;
            const neededPackages = neededUnits / item.units_per_package;
            const newStock = (item.current_stock || 0) - neededPackages;

            await supabase
              .from('items')
              .update({
                current_stock: newStock,
                last_count_date: new Date().toISOString().split('T')[0],
                last_counted_by: user.id,
              })
              .eq('id', item.id);

            await supabase.from('stock_history').insert({
              item_id: item.id,
              previous_stock: item.current_stock,
              new_stock: newStock,
              changed_by: user.id,
              movement_type: 'withdrawal',
              reason: `${t('dining.sale_reason')}: ${cartItem.name} x${cartItem.quantity} - ${orderLabel}`,
              order_id: orderId,
              order_item_id: orderItem.id,
            });
          }
        } else if (cartItem.itemId) {
          const item = items.find((i) => i.id === cartItem.itemId);
          if (item) {
            const newStock = (item.current_stock || 0) - cartItem.quantity;

            await supabase
              .from('items')
              .update({
                current_stock: newStock,
                last_count_date: new Date().toISOString().split('T')[0],
                last_counted_by: user.id,
              })
              .eq('id', item.id);

            await supabase.from('stock_history').insert({
              item_id: item.id,
              previous_stock: item.current_stock,
              new_stock: newStock,
              changed_by: user.id,
              movement_type: 'withdrawal',
              reason: `${t('pos.direct_sale')}: ${cartItem.name} x${cartItem.quantity} - ${orderLabel}`,
              order_id: orderId,
              order_item_id: orderItem.id,
            });
          }
        }

        newTotal += cartItem.price * cartItem.quantity;
      }

      await supabase.from('orders').update({ total: newTotal }).eq('id', orderId);

      toast({ title: t('pos.sent_to_kitchen') });
      setCart([]);
      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error('Error sending to kitchen:', error);
      toast({
        title: t('common.error'),
        description: t('pos.send_error'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Cart content (shared between sidebar and drawer)
  const cartContent = (
    <>
      <ScrollArea className="flex-1">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">{t('pos.cart_empty')}</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cart.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.price)} cada
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="font-bold">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Cart Footer */}
      <div className="p-4 border-t bg-background space-y-3">
        <div className="flex items-center justify-between text-lg font-bold">
          <span>{t('pos.subtotal')}</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-xl font-bold text-primary">
          <span>{t('pos.new_total')}</span>
          <span>{formatCurrency(currentTotal + cartTotal)}</span>
        </div>
        <Button
          className="w-full h-14 text-lg"
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
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0 flex flex-col">
          {/* Header */}
          <DialogHeader className="p-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <DialogTitle className="text-xl">
                    {t('pos.new_order')} - {orderLabel}
                  </DialogTitle>
                  <DialogDescription>
                    {t('pos.add_items_desc')}
                  </DialogDescription>
                </div>
              </div>

              {/* Mobile cart button */}
              {isMobile && (
                <Button
                  variant="outline"
                  className="relative"
                  onClick={() => setCartDrawerOpen(true)}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {cart.length}
                    </Badge>
                  )}
                </Button>
              )}

              {!isMobile && (
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {t('pos.current_total')}: {formatCurrency(currentTotal)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Mobile: Horizontal category bar */}
          {isMobile && (
            <div className="border-b p-3 shrink-0">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('pos.search_products')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectedCategory(null)}
                >
                  {t('pos.all')}
                </Button>
                {productPosCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Desktop: Category Sidebar */}
            {!isMobile && (
              <div className="w-52 border-r flex flex-col bg-muted/30 shrink-0">
                <ScrollArea className="flex-1 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* "Todas" button */}
                    <Button
                      variant={selectedCategory === null ? 'default' : 'outline'}
                      className={cn(
                        "h-14 text-xs font-bold uppercase col-span-2",
                        selectedCategory === null && "ring-2 ring-primary/50"
                      )}
                      onClick={() => setSelectedCategory(null)}
                    >
                      {t('pos.all')}
                    </Button>

                    {/* Category buttons */}
                    {productPosCategories.map((cat) => (
                      <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? 'default' : 'outline'}
                        className={cn(
                          "h-14 text-xs font-bold uppercase leading-tight",
                          selectedCategory === cat.id && "ring-2 ring-primary/50"
                        )}
                        onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>

                {/* Bottom actions */}
                <div className="p-3 border-t space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={onClose}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t('pos.back')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-between"
                    onClick={() => {
                      // Scroll to cart or highlight it
                      const cartEl = document.getElementById('pos-cart-sidebar');
                      cartEl?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('pos.review')}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Desktop Search */}
              {!isMobile && (
                <div className="p-4 border-b shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('pos.search_products')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Products */}
              <ScrollArea className="flex-1 p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-muted-foreground">{t('common.loading')}</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <UtensilsCrossed className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">{t('pos.no_products')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => (
                      <Card
                        key={`${product.type}-${product.id}`}
                        className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                            {product.type === 'dish' ? (
                              <UtensilsCrossed className="h-8 w-8 text-primary" />
                            ) : (
                              <Coffee className="h-8 w-8 text-primary" />
                            )}
                          </div>
                          <h3 className="font-medium text-sm line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="mt-1 font-bold text-primary">
                            {formatCurrency(product.price)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Desktop: Cart Sidebar */}
            {!isMobile && (
              <div id="pos-cart-sidebar" className="w-80 border-l flex flex-col bg-muted/30">
                <div className="p-4 border-b bg-background">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    <h3 className="font-semibold">{t('pos.cart')}</h3>
                    {cart.length > 0 && (
                      <Badge variant="secondary">{cart.length}</Badge>
                    )}
                  </div>
                </div>
                {cartContent}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile: Cart Drawer */}
      {isMobile && (
        <Drawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t('pos.cart')}
                {cart.length > 0 && (
                  <Badge variant="secondary">{cart.length}</Badge>
                )}
              </DrawerTitle>
              <DrawerDescription>
                {t('pos.current_total')}: {formatCurrency(currentTotal)}
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
            <AlertDialogAction onClick={() => setStockAlertOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
