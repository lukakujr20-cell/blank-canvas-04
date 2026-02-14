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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Pencil,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import BillReviewModal from '@/components/BillReviewModal';
import { CreditCard } from 'lucide-react';

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
  recipe_units_per_consumption?: number | null;
  recipe_unit?: string | null;
  sub_unit?: string | null;
}

interface PosCategory {
  id: string;
  name: string;
  destination: string;
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
  destination?: string;
}

interface TechnicalSheet {
  id: string;
  dish_id: string;
  item_id: string;
  quantity_per_sale: number;
  unit?: string | null;
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

const POS_CAT_COLORS = [
  'hsl(var(--pos-cat-1))',
  'hsl(var(--pos-cat-2))',
  'hsl(var(--pos-cat-3))',
  'hsl(var(--pos-cat-4))',
  'hsl(var(--pos-cat-5))',
  'hsl(var(--pos-cat-6))',
  'hsl(var(--pos-cat-7))',
  'hsl(var(--pos-cat-8))',
];

function getCatColor(index: number): string {
  return POS_CAT_COLORS[index % POS_CAT_COLORS.length];
}

// Currency mask helper
function formatPriceInput(value: string): string {
  // Remove non-numeric chars
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return (num / 100).toFixed(2);
}

export default function POSInterface({
  onClose,
  orderId,
  orderLabel,
  tableId,
  onOrderUpdated,
  currentTotal,
}: POSInterfaceProps) {
  const { user, isHost, isSuperAdmin, isAdmin, role } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const canManage = isHost || isSuperAdmin || isAdmin;
  const navigate = useNavigate();

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
  const [consumptionType, setConsumptionType] = useState<string>('dine_in');

  // Notes editing state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState('');

  // Bill review state
  const [billReviewOpen, setBillReviewOpen] = useState(false);
  const [orderForBill, setOrderForBill] = useState<any>(null);
  const [orderItemsForBill, setOrderItemsForBill] = useState<any[]>([]);

  // Category management state
  const [newCatDialogOpen, setNewCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDestination, setNewCatDestination] = useState<string>('kitchen');
  const [editCatDialogOpen, setEditCatDialogOpen] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDestination, setEditCatDestination] = useState<string>('kitchen');
  const [deleteCatAlertOpen, setDeleteCatAlertOpen] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  // Product management state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ id: string; type: 'dish' | 'item' } | null>(null);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productPosCatId, setProductPosCatId] = useState<string>('none');
  const [productDirectSale, setProductDirectSale] = useState(false);
  const [productNotes, setProductNotes] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productIngredients, setProductIngredients] = useState<{ item_id: string; quantity: number; unit: string }[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [creatingPosCategory, setCreatingPosCategory] = useState(false);
  const [newPosCategoryName, setNewPosCategoryName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dishesRes, itemsRes, categoriesRes, posCategoriesRes, sheetsRes, orderRes] = await Promise.all([
        supabase.from('dishes').select('*').order('name'),
        supabase.from('items').select('*'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('pos_categories').select('*').order('name'),
        supabase.from('technical_sheets').select('*'),
        supabase.from('orders').select('total, consumption_type').eq('id', orderId).single(),
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
        if ((orderRes.data as any).consumption_type) {
          setConsumptionType((orderRes.data as any).consumption_type);
        }
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

  const getRestaurantId = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user!.id)
      .single();
    return (profile as any)?.restaurant_id || null;
  };

  // ── Category CRUD ──
  const addCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    try {
      const restaurantId = await getRestaurantId();
      const { error } = await supabase.from('pos_categories').insert({
        name: trimmed,
        restaurant_id: restaurantId,
        destination: newCatDestination,
      });
      if (error) throw error;

      // Auto-sync: also create a matching stock category
      const { error: stockCatError } = await supabase.from('categories').insert({
        name: trimmed,
        restaurant_id: restaurantId,
      });
      if (stockCatError) {
        console.warn('Stock category sync skipped (may already exist):', stockCatError.message);
      }

      toast({ title: t('pos.category_created') });
      setNewCatName('');
      setNewCatDestination('kitchen');
      setNewCatDialogOpen(false);
      const { data: freshCats } = await supabase.from('pos_categories').select('*').order('name');
      if (freshCats) setPosCategories(freshCats);
    } catch (err) {
      console.error(err);
      toast({ title: t('pos.category_error'), variant: 'destructive' });
    }
  };

  const updateCategory = async () => {
    const trimmed = editCatName.trim();
    if (!trimmed || !editCatId) return;
    try {
      const { error } = await supabase.from('pos_categories').update({ 
        name: trimmed, 
        destination: editCatDestination 
      }).eq('id', editCatId);
      if (error) throw error;
      toast({ title: t('pos.category_updated') });
      setEditCatDialogOpen(false);
      setEditCatId(null);
      setEditCatName('');
      const { data: freshCats } = await supabase.from('pos_categories').select('*').order('name');
      if (freshCats) setPosCategories(freshCats);
    } catch (err) {
      console.error(err);
      toast({ title: t('pos.category_update_error'), variant: 'destructive' });
    }
  };

  const deleteCategory = async () => {
    if (!deleteCatId) return;
    try {
      await supabase.from('dishes').update({ pos_category_id: null }).eq('pos_category_id', deleteCatId);
      await supabase.from('items').update({ pos_category_id: null }).eq('pos_category_id', deleteCatId);
      const { error } = await supabase.from('pos_categories').delete().eq('id', deleteCatId);
      if (error) throw error;
      toast({ title: t('pos.category_deleted') });
      setDeleteCatAlertOpen(false);
      setDeleteCatId(null);
      if (selectedCategory === deleteCatId) setSelectedCategory(null);
      const { data: freshCats } = await supabase.from('pos_categories').select('*').order('name');
      if (freshCats) setPosCategories(freshCats);
    } catch (err) {
      console.error(err);
      toast({ title: t('pos.category_delete_error'), variant: 'destructive' });
    }
  };

  // ── Product CRUD ──
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductPosCatId(selectedCategory || 'none');
    setProductDirectSale(false);
    setProductNotes('');
    setProductIngredients([]);
    setIngredientSearch('');
    setCreatingPosCategory(false);
    setNewPosCategoryName('');
    setProductDialogOpen(true);
  };

  const openEditProduct = async (product: { id: string; name: string; price: number; type: 'dish' | 'item'; pos_category_id?: string | null; description?: string | null }) => {
    setEditingProduct({ id: product.id, type: product.type });
    setProductName(product.name);
    setProductDescription(product.description || '');
    setProductPrice(product.price.toFixed(2));
    setProductPosCatId(product.pos_category_id || 'none');
    setProductDirectSale(product.type === 'item');
    setProductNotes('');
    setIngredientSearch('');
    setCreatingPosCategory(false);
    setNewPosCategoryName('');

    // Load existing technical sheets for this dish
    if (product.type === 'dish') {
      const existing = technicalSheets.filter(ts => ts.dish_id === product.id);
      setProductIngredients(existing.map(ts => {
        const stockItem = items.find(i => i.id === ts.item_id);
        return {
          item_id: ts.item_id,
          quantity: ts.quantity_per_sale,
          unit: ts.unit || stockItem?.recipe_unit || stockItem?.sub_unit || stockItem?.unit || 'un',
        };
      }));
    } else {
      setProductIngredients([]);
    }

    setProductDialogOpen(true);
  };

  const saveProduct = async () => {
    const trimmedName = productName.trim();
    const price = parseFloat(productPrice);
    if (!trimmedName || isNaN(price) || price <= 0) return;
    const posCatId = productPosCatId === 'none' ? null : productPosCatId;
    const restaurantId = await getRestaurantId();

    try {
      let dishId: string | null = null;

      if (editingProduct) {
        if (editingProduct.type === 'dish') {
          const { error } = await supabase.from('dishes').update({
            name: trimmedName, price, pos_category_id: posCatId,
            description: productDescription.trim() || null,
          }).eq('id', editingProduct.id);
          if (error) throw error;
          dishId = editingProduct.id;
        } else {
          const { error } = await supabase.from('items').update({
            name: trimmedName, price, pos_category_id: posCatId,
          }).eq('id', editingProduct.id);
          if (error) throw error;
        }
      } else {
        if (productDirectSale) {
          const { error } = await supabase.from('items').insert({
            name: trimmedName, price, pos_category_id: posCatId,
            direct_sale: true, restaurant_id: restaurantId,
            unit: 'un', min_stock: 0, units_per_package: 1,
          });
          if (error) throw error;
        } else {
          const { data: newDish, error } = await supabase.from('dishes').insert({
            name: trimmedName, price, pos_category_id: posCatId,
            description: productDescription.trim() || null,
            restaurant_id: restaurantId,
          }).select('id').single();
          if (error) throw error;
          dishId = newDish.id;
        }
      }

      // Save technical sheets for dishes (non-direct-sale)
      if (dishId && !productDirectSale && productIngredients.length > 0) {
        // Delete existing sheets for this dish
        await supabase.from('technical_sheets').delete().eq('dish_id', dishId);
        // Insert new ones
        const sheetsToInsert = productIngredients
          .filter(ing => ing.item_id && ing.quantity > 0)
          .map(ing => ({
            dish_id: dishId!,
            item_id: ing.item_id,
            quantity_per_sale: ing.quantity,
            unit: ing.unit || null,
          }));
        if (sheetsToInsert.length > 0) {
          const { error: sheetError } = await supabase.from('technical_sheets').insert(sheetsToInsert);
          if (sheetError) throw sheetError;
        }
      }

      toast({ title: t('pos.product_saved') });
      setProductDialogOpen(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: t('pos.product_save_error'), variant: 'destructive' });
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

  const displayPosCategories = posCategories;

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
      const sheetUnit = sheet.unit || item.recipe_unit || item.sub_unit || item.unit;
      let neededPackages: number;
      if (sheetUnit === item.unit) {
        neededPackages = neededUnits;
      } else if (sheetUnit === item.sub_unit) {
        neededPackages = neededUnits / (item.units_per_package || 1);
      } else {
        const totalConversion = (item.units_per_package || 1) * (item.recipe_units_per_consumption || 1);
        neededPackages = neededUnits / totalConversion;
      }
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

  // Get destination for a product based on its pos_category
  const getProductDestination = (product: typeof allProducts[0]): string => {
    if (!product.pos_category_id) return 'kitchen';
    const cat = posCategories.find(c => c.id === product.pos_category_id);
    return cat?.destination || 'kitchen';
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

    const destination = getProductDestination(product);

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
        destination,
      }];
    });

    // Auto-open cart drawer on mobile
    if (isMobile) {
      setCartDrawerOpen(true);
    }
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

  const updateCartNotes = (cartId: string, notes: string) => {
    setCart((prev) => prev.map((c) => c.id === cartId ? { ...c, notes } : c));
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
        const itemDestination = cartItem.destination || 'kitchen';
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId, dish_id: cartItem.dishId || null, dish_name: cartItem.name,
            quantity: cartItem.quantity, unit_price: cartItem.price, status: itemStatus,
            notes: cartItem.notes || null, sent_at: new Date().toISOString(),
            destination: itemDestination,
          })
          .select().single();
        if (itemError) throw itemError;

        if (cartItem.dishId) {
          const dishSheets = technicalSheets.filter((ts) => ts.dish_id === cartItem.dishId);
          for (const sheet of dishSheets) {
            const item = items.find((i) => i.id === sheet.item_id);
            if (!item) continue;
            const neededUnits = sheet.quantity_per_sale * cartItem.quantity;
            const sheetUnit = sheet.unit || item.recipe_unit || item.sub_unit || item.unit;
            let neededPackages: number;

            if (sheetUnit === item.unit) {
              // Quantity is in purchase units — direct deduction
              neededPackages = neededUnits;
            } else if (sheetUnit === item.sub_unit) {
              // Quantity is in consumption units — divide by units_per_package
              neededPackages = neededUnits / (item.units_per_package || 1);
            } else {
              // Quantity is in recipe units — divide by full conversion
              const totalConversion = (item.units_per_package || 1) * (item.recipe_units_per_consumption || 1);
              neededPackages = neededUnits / totalConversion;
            }

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

      // Update total, status, and consumption type
      await supabase.from('orders').update({ 
        total: newTotal, 
        status: 'open',
        consumption_type: consumptionType,
      }).eq('id', orderId);
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

  // ── Open Bill Review ──
  const openBillReview = async () => {
    try {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase.from('order_items').select('*').eq('order_id', orderId).order('sent_at', { ascending: true }),
      ]);
      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;
      setOrderForBill(orderRes.data);
      setOrderItemsForBill(itemsRes.data || []);
      setBillReviewOpen(true);
    } catch (error) {
      console.error('Error loading bill:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const closeOrder = async (paymentMethod?: string) => {
    try {
      // Check if order has items
      const { data: existingItems } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);

      const isCancel = !existingItems || existingItems.length === 0 || liveTotal === 0;

      if (isCancel) {
        await supabase.from('order_items').delete().eq('order_id', orderId);
        await supabase.from('orders').update({
          status: 'cancelled',
          closed_at: new Date().toISOString(),
          total: 0,
        }).eq('id', orderId);
      } else {
        await supabase.from('orders').update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          payment_method: paymentMethod || null,
        }).eq('id', orderId);
      }

      if (tableId) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'free', current_order_id: null })
          .eq('id', tableId);
      }

      toast({ title: isCancel ? t('dining.table_released') : t('billing.table_finalized') });
      setBillReviewOpen(false);
      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error('Error closing order:', error);
      toast({ title: t('common.error'), description: t('dining.close_error'), variant: 'destructive' });
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
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <p className="font-semibold text-sm leading-tight">{item.name}</p>
                    {item.destination && (
                      <Badge variant="outline" className="text-[10px] mt-0.5 px-1.5 py-0">
                        {item.destination === 'bar' ? '🍸 Bar' : '🍳 Cozinha'}
                      </Badge>
                    )}
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive/80 p-0.5">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Notes */}
                {editingNotesId === item.id ? (
                  <div className="mt-1 mb-2">
                    <Input
                      placeholder="Ex: Sem gelo, com limão..."
                      value={editingNotesValue}
                      onChange={(e) => setEditingNotesValue(e.target.value)}
                      onBlur={() => {
                        updateCartNotes(item.id, editingNotesValue);
                        setEditingNotesId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateCartNotes(item.id, editingNotesValue);
                          setEditingNotesId(null);
                        }
                      }}
                      className="h-7 text-xs"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-0.5 mb-1"
                    onClick={() => {
                      setEditingNotesId(item.id);
                      setEditingNotesValue(item.notes || '');
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {item.notes ? item.notes : 'Obs...'}
                  </button>
                )}

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
        {/* Consumption Type Toggle */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
          <RadioGroup
            value={consumptionType}
            onValueChange={setConsumptionType}
            className="flex gap-3 w-full"
          >
            <div className="flex items-center gap-1.5 flex-1">
              <RadioGroupItem value="dine_in" id="dine_in" />
              <Label htmlFor="dine_in" className="text-xs cursor-pointer font-medium">
                🍽️ No Local
              </Label>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <RadioGroupItem value="takeaway" id="takeaway" />
              <Label htmlFor="takeaway" className="text-xs cursor-pointer font-medium">
                📦 Para Viagem
              </Label>
            </div>
          </RadioGroup>
        </div>

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
        {liveTotal > 0 && cart.length === 0 && (
          <Button
            variant="outline"
            className="w-full h-12 text-base font-bold rounded-xl border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            size="lg"
            onClick={openBillReview}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            {t('billing.finalize_sale')}
          </Button>
        )}
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

            {/* ── Category Bar ── */}
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
                        ? "ring-[3px] ring-primary scale-110 border-2 border-primary"
                        : "group-hover:scale-105 border-2 border-transparent"
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

                {displayPosCategories.map((cat, index) => {
                  const Icon = getCategoryIcon(cat.name);
                  const isActive = selectedCategory === cat.id;
                  const color = getCatColor(index);
                  return (
                    <div key={cat.id} className="relative flex flex-col items-center gap-2 min-w-[64px] shrink-0 group/cat">
                      <button
                        className="flex flex-col items-center gap-2"
                        onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                      >
                        <div
                          className={cn(
                            "h-16 w-16 rounded-full flex items-center justify-center transition-all shadow-md",
                            isActive
                              ? "ring-[3px] ring-primary scale-110 border-2 border-primary"
                              : "group-hover/cat:scale-105 border-2 border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        >
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <span className={cn(
                          "text-[11px] font-bold uppercase tracking-wide leading-tight text-center w-[72px] line-clamp-2",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}>
                          {cat.name}
                        </span>
                      </button>

                      {/* Edit/Delete overlay on hover (only for managers) */}
                      {canManage && (
                        <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover/cat:opacity-100 transition-opacity z-10">
                          <button
                            className="h-6 w-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditCatId(cat.id);
                              setEditCatName(cat.name);
                              setEditCatDestination(cat.destination || 'kitchen');
                              setEditCatDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button
                            className="h-6 w-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-destructive/10 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCatId(cat.id);
                              setDeleteCatAlertOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Category button */}
                {canManage && (
                  <button
                    className="flex flex-col items-center gap-2 min-w-[64px] shrink-0 group"
                    onClick={() => setNewCatDialogOpen(true)}
                  >
                    <div className="h-16 w-16 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/40 hover:border-primary transition-colors group-hover:scale-105">
                      <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t('common.add')}
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
                <div className="flex flex-col items-center justify-center py-16 min-h-[200px]">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium text-center mb-4">{t('pos.no_products')}</p>
                  {canManage && (
                    <Button onClick={openAddProduct} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('pos.add_product')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map((product) => {
                    const ProductIcon = product.type === 'dish' ? UtensilsCrossed : Coffee;
                    const catIdx = displayPosCategories.findIndex(c => c.id === product.pos_category_id);
                    const iconBgColor = catIdx >= 0 ? getCatColor(catIdx) : 'hsl(var(--muted))';

                    return (
                      <div
                        key={`${product.type}-${product.id}`}
                        className="relative bg-card rounded-xl border shadow-sm hover:shadow-md transition-all text-left overflow-hidden group/product"
                      >
                        {/* Edit button for managers */}
                        {canManage && (
                          <button
                            className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-card/90 border shadow-sm flex items-center justify-center opacity-0 group-hover/product:opacity-100 transition-opacity hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditProduct(product);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          className="w-full text-left"
                          onClick={() => addToCart(product)}
                        >
                          {/* Product image/icon area */}
                          <div
                            className="w-full aspect-[4/3] flex items-center justify-center rounded-t-xl"
                            style={{ backgroundColor: iconBgColor + '22' }}
                          >
                            <div
                              className="h-16 w-16 rounded-full flex items-center justify-center group-hover/product:scale-110 transition-transform"
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
                      </div>
                    );
                  })}

                  {/* Add Product card for managers */}
                  {canManage && (
                    <button
                      className="bg-card rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary shadow-sm hover:shadow-md transition-all text-center overflow-hidden flex flex-col items-center justify-center min-h-[180px] group"
                      onClick={openAddProduct}
                    >
                      <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/40 group-hover:border-primary flex items-center justify-center mb-3 transition-colors">
                        <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        {t('pos.add_product')}
                      </span>
                    </button>
                  )}
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
            {canManage && (
              <AlertDialogCancel
                onClick={() => {
                  setStockAlertOpen(false);
                  const missingItems = stockIssues.map(i => i.itemName).join(',');
                  navigate(`/shopping-list?highlight=${encodeURIComponent(missingItems)}`);
                }}
              >
                {t('pos.go_to_shopping_list')}
              </AlertDialogCancel>
            )}
            <AlertDialogAction onClick={() => setStockAlertOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Category Dialog */}
      <Dialog open={newCatDialogOpen} onOpenChange={setNewCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pos.add_category')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input
                placeholder="Ex: Bebidas, Lanches..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Destino do Pedido</Label>
              <RadioGroup
                value={newCatDestination}
                onValueChange={setNewCatDestination}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="kitchen" id="new-dest-kitchen" />
                  <Label htmlFor="new-dest-kitchen" className="cursor-pointer text-sm">🍳 Cozinha</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bar" id="new-dest-bar" />
                  <Label htmlFor="new-dest-bar" className="cursor-pointer text-sm">🍸 Bar</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Itens desta categoria serão enviados automaticamente para o destino selecionado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCatDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addCategory} disabled={!newCatName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCatDialogOpen} onOpenChange={setEditCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pos.edit_category')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateCategory()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Destino do Pedido</Label>
              <RadioGroup
                value={editCatDestination}
                onValueChange={setEditCatDestination}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="kitchen" id="edit-dest-kitchen" />
                  <Label htmlFor="edit-dest-kitchen" className="cursor-pointer text-sm">🍳 Cozinha</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bar" id="edit-dest-bar" />
                  <Label htmlFor="edit-dest-bar" className="cursor-pointer text-sm">🍸 Bar</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCatDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={updateCategory} disabled={!editCatName.trim()}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={deleteCatAlertOpen} onOpenChange={setDeleteCatAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pos.delete_category')}</AlertDialogTitle>
            <AlertDialogDescription>{t('pos.confirm_delete_category')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteCategory}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Product Dialog — mirrors /dishes modal */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? t('pos.edit_product') : t('dishes.new')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>{t('dishes.name')}</Label>
              <Input
                placeholder={t('dishes.name_placeholder')}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Description + Price row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('dishes.description')}</Label>
                <Textarea
                  placeholder={t('dishes.description_placeholder')}
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('dishes.price')} (€)</Label>
                <div className="relative">
                  <Input
                    placeholder="0,00"
                    value={productPrice}
                    onChange={(e) => {
                      const formatted = formatPriceInput(e.target.value);
                      setProductPrice(formatted);
                    }}
                    inputMode="numeric"
                    className="pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">€</span>
                </div>
              </div>
            </div>

            {/* POS Category with inline creation */}
            <div className="space-y-2">
              <Label>{t('dishes.sale_category')} *</Label>
              <Select
                value={productPosCatId}
                onValueChange={(value) => {
                  if (value === '__new__') {
                    setCreatingPosCategory(true);
                  } else {
                    setProductPosCatId(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('dishes.sale_category_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('dishes.none')}</SelectItem>
                  {posCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} {cat.destination === 'bar' ? '🍸' : '🍳'}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__" className="text-primary font-medium">
                    <span className="flex items-center gap-1">
                      <Plus className="h-3 w-3" /> {t('dishes.new_category')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {creatingPosCategory && (
                <div className="flex items-center gap-2 mt-2 p-2 border rounded-lg bg-muted/30">
                  <Input
                    placeholder={t('dishes.new_category_placeholder')}
                    value={newPosCategoryName}
                    onChange={(e) => setNewPosCategoryName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!newPosCategoryName.trim()) return;
                        const restaurantId = await getRestaurantId();
                        const { data, error } = await supabase.from('pos_categories').insert({ name: newPosCategoryName.trim(), restaurant_id: restaurantId, destination: 'kitchen' }).select().single();
                        if (!error && data) {
                          // Auto-sync: also create stock category
                          await supabase.from('categories').insert({ name: newPosCategoryName.trim(), restaurant_id: restaurantId });
                          setPosCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                          setProductPosCatId(data.id);
                          setNewPosCategoryName('');
                          setCreatingPosCategory(false);
                          toast({ title: t('dishes.category_created') });
                        }
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      if (!newPosCategoryName.trim()) return;
                      const restaurantId = await getRestaurantId();
                      const { data, error } = await supabase.from('pos_categories').insert({ name: newPosCategoryName.trim(), restaurant_id: restaurantId, destination: 'kitchen' }).select().single();
                      if (!error && data) {
                        // Auto-sync: also create stock category
                        await supabase.from('categories').insert({ name: newPosCategoryName.trim(), restaurant_id: restaurantId });
                        setPosCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                        setProductPosCatId(data.id);
                        setNewPosCategoryName('');
                        setCreatingPosCategory(false);
                        toast({ title: t('dishes.category_created') });
                      }
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCreatingPosCategory(false); setNewPosCategoryName(''); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t('dishes.sale_category_hint')}
              </p>
            </div>

            {/* Direct Sale Switch */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="direct-sale-switch" className="cursor-pointer text-sm font-medium">
                  {t('pos.product_direct_sale')}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ativa para itens sem ficha técnica (ex: bebidas)
                </p>
              </div>
              <Switch
                id="direct-sale-switch"
                checked={productDirectSale}
                onCheckedChange={(checked) => {
                  setProductDirectSale(checked);
                  if (checked) setProductIngredients([]);
                }}
              />
            </div>

            {/* Ingredients / Technical Sheet Section */}
            {!productDirectSale && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">{t('dishes.ingredients')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProductIngredients(prev => [...prev, { item_id: '', quantity: 0, unit: '' }])}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {t('dishes.add_ingredient')}
                  </Button>
                </div>

                {productIngredients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
                    {t('dishes.no_ingredients')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {productIngredients.map((ing, index) => {
                      const selectedIds = productIngredients
                        .filter((_, i) => i !== index)
                        .map((x) => x.item_id);
                      const availableItems = items.filter(
                        (item) => !item.direct_sale && !selectedIds.includes(item.id)
                      );
                      const stockItem = items.find((i) => i.id === ing.item_id);

                      // Build unit options for this item (3 levels)
                      const unitOptions: { value: string; label: string }[] = [];
                      if (stockItem) {
                        unitOptions.push({ value: stockItem.unit, label: `${stockItem.unit} (${t('dishes.unit_primary')})` });
                        if (stockItem.sub_unit) {
                          unitOptions.push({ value: stockItem.sub_unit, label: `${stockItem.sub_unit} (${t('dishes.unit_secondary')})` });
                        }
                        if (stockItem.recipe_unit) {
                          unitOptions.push({ value: stockItem.recipe_unit, label: `${stockItem.recipe_unit} (${t('dishes.unit_tertiary')})` });
                        }
                      }

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30"
                        >
                          <Select
                            value={ing.item_id || undefined}
                            onValueChange={(value) => {
                              const selected = items.find(i => i.id === value);
                              const defaultUnit = selected?.recipe_unit || selected?.sub_unit || selected?.unit || 'un';
                              setProductIngredients(prev =>
                                prev.map((item, i) => i === index ? { ...item, item_id: value, unit: defaultUnit } : item)
                              );
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder={t('dishes.select_ingredient')} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            placeholder={t('dishes.quantity')}
                            value={ing.quantity || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setProductIngredients(prev =>
                                prev.map((item, i) => i === index ? { ...item, quantity: val } : item)
                              );
                            }}
                            className="w-20"
                          />
                          {ing.item_id && unitOptions.length > 0 && (
                            <Select
                              value={ing.unit || unitOptions[0]?.value}
                              onValueChange={(value) => {
                                setProductIngredients(prev =>
                                  prev.map((item, i) => i === index ? { ...item, unit: value } : item)
                                );
                              }}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setProductIngredients(prev => prev.filter((_, i) => i !== index))}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={saveProduct}
              disabled={!productName.trim() || !productPrice || parseFloat(productPrice) <= 0}
            >
              {editingProduct ? t('inventory.save_changes') : t('dishes.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Review Modal */}
      <BillReviewModal
        open={billReviewOpen}
        onOpenChange={setBillReviewOpen}
        order={orderForBill}
        orderItems={orderItemsForBill}
        tableNumber={null}
        waiterName={''}
        onAddItem={() => {
          setBillReviewOpen(false);
        }}
        onClose={closeOrder}
      />
    </>
  );
}
