import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatQuantity } from '@/lib/formatNumber';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SaleDestinationModal from '@/components/SaleDestinationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Trash2,
  Pencil,
  UtensilsCrossed,
  ShoppingCart,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  created_at: string;
  category_id: string | null;
  pos_category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface PosCategory {
  id: string;
  name: string;
}

interface TechnicalSheet {
  id: string;
  dish_id: string;
  item_id: string;
  quantity_per_sale: number;
  unit: string | null;
}

interface Item {
  id: string;
  name: string;
  unit: string;
  sub_unit: string | null;
  recipe_unit: string | null;
  current_stock: number;
  min_stock: number;
  units_per_package: number;
  recipe_units_per_consumption: number | null;
}

interface Ingredient {
  item_id: string;
  quantity: number;
  unit: string;
}

interface StockIssue {
  itemName: string;
  needed: number;
  available: number;
  unit: string;
}

export default function Dishes() {
  const { user, restaurantId } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [technicalSheets, setTechnicalSheets] = useState<TechnicalSheet[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [posCategories, setPosCategories] = useState<PosCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [selectedDishForSale, setSelectedDishForSale] = useState<Dish | null>(null);
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [confirmSaleOpen, setConfirmSaleOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [destinationModalOpen, setDestinationModalOpen] = useState(false);

  // Form states
  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    price: 0,
    category_id: '',
    pos_category_id: '',
  });
  const [newPosCategoryName, setNewPosCategoryName] = useState('');
  const [creatingPosCategory, setCreatingPosCategory] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dishesRes, sheetsRes, itemsRes, categoriesRes, posCategoriesRes] = await Promise.all([
        supabase.from('dishes').select('*').order('name'),
        supabase.from('technical_sheets').select('*'),
        supabase.from('items').select('id, name, unit, sub_unit, recipe_unit, current_stock, min_stock, units_per_package, recipe_units_per_consumption').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('pos_categories').select('id, name').order('name'),
      ]);

      if (dishesRes.error) throw dishesRes.error;
      if (sheetsRes.error) throw sheetsRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setDishes(dishesRes.data || []);
      setTechnicalSheets(sheetsRes.data || []);
      setItems(itemsRes.data || []);
      setPosCategories(posCategoriesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('common.error'),
        description: t('dishes.load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDishIngredients = (dishId: string) => {
    return technicalSheets.filter((ts) => ts.dish_id === dishId);
  };

  const getItemById = (itemId: string) => {
    return items.find((i) => i.id === itemId);
  };

  const calculateDishCost = (dishId: string) => {
    const dishIngredients = getDishIngredients(dishId);
    // For now, we show the number of ingredients since we don't have cost per item
    return dishIngredients.length;
  };

  const resetForm = () => {
    setDishForm({ name: '', description: '', price: 0, category_id: '', pos_category_id: '' });
    setIngredients([]);
    setEditingDish(null);
  };

  const openCreateDish = () => {
    resetForm();
    setDishModalOpen(true);
  };

  const openEditDish = (dish: Dish) => {
    setEditingDish(dish);
    setDishForm({
      name: dish.name,
      description: dish.description || '',
      price: dish.price || 0,
      category_id: dish.category_id || '',
      pos_category_id: dish.pos_category_id || '',
    });
    const dishIngredients = getDishIngredients(dish.id);
    setIngredients(
      dishIngredients.map((di) => {
        const item = getItemById(di.item_id);
        return {
          item_id: di.item_id,
          quantity: di.quantity_per_sale,
          unit: di.unit || item?.unit || '',
        };
      })
    );
    setDishModalOpen(true);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { item_id: '', quantity: 0, unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const getAvailableUnits = (itemId: string): { value: string; label: string }[] => {
    const item = getItemById(itemId);
    if (!item) return [];
    const units: { value: string; label: string }[] = [];
    if (item.unit) units.push({ value: item.unit, label: `${item.unit} (${t('dishes.unit_primary')})` });
    if (item.sub_unit) units.push({ value: item.sub_unit, label: `${item.sub_unit} (${t('dishes.unit_secondary')})` });
    if (item.recipe_unit) units.push({ value: item.recipe_unit, label: `${item.recipe_unit} (${t('dishes.unit_tertiary')})` });
    return units;
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    // When item changes, auto-set unit to primary
    if (field === 'item_id') {
      const item = getItemById(value as string);
      if (item) {
        // Default to the most granular unit available
        updated[index].unit = item.recipe_unit || item.sub_unit || item.unit;
      }
    }
    setIngredients(updated);
  };

  const handleSaveDish = async () => {
    if (!dishForm.name.trim()) {
      toast({
        title: t('common.error'),
        description: t('dishes.name_required'),
        variant: 'destructive',
      });
      return;
    }

    // Validate ingredients (optional - dishes can have no ingredients)
    const validIngredients = ingredients.filter(
      (ing) => ing.item_id && ing.quantity > 0
    );

    setProcessingAction(true);

    try {
      let dishId: string;

      if (editingDish) {
        // Update dish
        const { error } = await supabase
          .from('dishes')
          .update({
            name: dishForm.name.trim(),
            description: dishForm.description.trim() || null,
            price: dishForm.price,
            category_id: dishForm.category_id || null,
            pos_category_id: dishForm.pos_category_id || null,
          })
          .eq('id', editingDish.id);

        if (error) throw error;
        dishId = editingDish.id;

        // Delete old technical sheets
        await supabase.from('technical_sheets').delete().eq('dish_id', dishId);
      } else {
        // Create dish
        const { data, error } = await supabase
          .from('dishes')
          .insert({
            name: dishForm.name.trim(),
            description: dishForm.description.trim() || null,
            price: dishForm.price,
            category_id: dishForm.category_id || null,
            pos_category_id: dishForm.pos_category_id || null,
            restaurant_id: restaurantId,
          })
          .select()
          .single();

        if (error) throw error;
        dishId = data.id;
      }

      // Insert technical sheets (only if there are valid ingredients)
      if (validIngredients.length > 0) {
        const sheetsToInsert = validIngredients.map((ing) => ({
          dish_id: dishId,
          item_id: ing.item_id,
          quantity_per_sale: ing.quantity,
          unit: ing.unit || null,
        }));

        const { error: sheetsError } = await supabase
          .from('technical_sheets')
          .insert(sheetsToInsert);

        if (sheetsError) throw sheetsError;
      }

      toast({
        title: editingDish ? t('dishes.updated') : t('dishes.created'),
      });
      setDishModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving dish:', error);
      toast({
        title: t('common.error'),
        description: t('dishes.save_error'),
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm(t('dishes.confirm_delete'))) return;

    try {
      // Delete technical sheets first
      await supabase.from('technical_sheets').delete().eq('dish_id', dishId);
      
      const { error } = await supabase.from('dishes').delete().eq('id', dishId);
      if (error) throw error;

      toast({ title: t('dishes.deleted') });
      fetchData();
    } catch (error) {
      console.error('Error deleting dish:', error);
      toast({
        title: t('common.error'),
        description: t('dishes.delete_error'),
        variant: 'destructive',
      });
    }
  };

  const openSaleModal = (dish: Dish) => {
    setSelectedDishForSale(dish);
    setSaleQuantity(1);
    setStockIssues([]);
    setSaleModalOpen(true);
  };

  /** Convert a quantity in the given unit to purchase units (for stock deduction) */
  const convertToPurchaseUnits = (qty: number, item: Item, selectedUnit: string | null): number => {
    const unit = selectedUnit || item.unit;
    const unitsPerPackage = item.units_per_package || 1;
    const recipeUnitsPerConsumption = item.recipe_units_per_consumption || 1;

    if (unit === item.unit) {
      // Already in purchase units
      return qty;
    }
    if (unit === item.sub_unit) {
      // Consumption units → purchase units
      return qty / unitsPerPackage;
    }
    if (unit === item.recipe_unit) {
      // Recipe units → purchase units
      return qty / (unitsPerPackage * recipeUnitsPerConsumption);
    }
    // Fallback
    return qty;
  };

  const validateStock = (dish: Dish, quantity: number): StockIssue[] => {
    const issues: StockIssue[] = [];
    const dishIngredients = getDishIngredients(dish.id);

    for (const ing of dishIngredients) {
      const item = getItemById(ing.item_id);
      if (!item) continue;

      const neededInPurchase = convertToPurchaseUnits(ing.quantity_per_sale * quantity, item, ing.unit);

      if (item.current_stock < neededInPurchase) {
        issues.push({
          itemName: item.name,
          needed: neededInPurchase,
          available: item.current_stock,
          unit: item.unit,
        });
      }
    }

    return issues;
  };

  const handlePrepareSale = () => {
    if (!selectedDishForSale || saleQuantity < 1) return;

    const issues = validateStock(selectedDishForSale, saleQuantity);
    
    if (issues.length > 0) {
      setStockIssues(issues);
      return;
    }

    // No issues, show destination modal
    setSaleModalOpen(false);
    setDestinationModalOpen(true);
  };

  const handleConfirmSale = async (destination: { type: 'table' | 'counter'; tableId?: string; tableNumber?: number; customerName?: string; orderId: string }) => {
    if (!selectedDishForSale || !user) return;

    setProcessingAction(true);

    try {
      const dishIngredients = getDishIngredients(selectedDishForSale.id);
      const orderLabel = destination.type === 'table' 
        ? `Mesa ${destination.tableNumber}` 
        : destination.customerName || 'Balcão';

      // Add item to order
      const { data: orderItem, error: orderItemError } = await supabase
        .from('order_items')
        .insert({
          order_id: destination.orderId,
          dish_id: selectedDishForSale.id,
          dish_name: selectedDishForSale.name,
          quantity: saleQuantity,
          unit_price: selectedDishForSale.price,
          status: 'pending',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderItemError) throw orderItemError;

      // Update order total
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('total')
        .eq('id', destination.orderId)
        .single();

      const newTotal = (currentOrder?.total || 0) + (selectedDishForSale.price * saleQuantity);
      await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', destination.orderId);

      // Deduct stock for each ingredient
      for (const ing of dishIngredients) {
        const item = getItemById(ing.item_id);
        if (!item) continue;

        const quantityToDeduct = convertToPurchaseUnits(ing.quantity_per_sale * saleQuantity, item, ing.unit);
        const newStock = item.current_stock - quantityToDeduct;

        // Update item stock
        const { error: updateError } = await supabase
          .from('items')
          .update({
            current_stock: newStock,
            last_count_date: new Date().toISOString().split('T')[0],
            last_counted_by: user.id,
          })
          .eq('id', ing.item_id);

        if (updateError) throw updateError;

        // Record in stock history with order reference
        const { error: historyError } = await supabase
          .from('stock_history')
          .insert({
            item_id: ing.item_id,
            previous_stock: item.current_stock,
            new_stock: newStock,
            changed_by: user.id,
            movement_type: 'withdrawal',
            reason: `${t('dishes.sale_reason')}: ${selectedDishForSale.name} x${saleQuantity} - ${orderLabel}`,
            order_id: destination.orderId,
            order_item_id: orderItem.id,
          });

        if (historyError) throw historyError;
      }

      toast({
        title: t('dishes.sale_success'),
        description: `${t('dishes.order_sent_to')} ${orderLabel}`,
      });

      setDestinationModalOpen(false);
      setConfirmSaleOpen(false);
      setSaleModalOpen(false);
      setSelectedDishForSale(null);
      fetchData();
    } catch (error) {
      console.error('Error processing sale:', error);
      toast({
        title: t('common.error'),
        description: t('dishes.sale_error'),
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const availableItemsForIngredient = (currentIndex: number) => {
    const selectedIds = ingredients
      .filter((_, i) => i !== currentIndex)
      .map((ing) => ing.item_id);
    return items.filter((item) => !selectedIds.includes(item.id));
  };

  if (loading) {
    return (
      <DashboardLayout requireAdmin>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{t('dishes.title')}</h1>
            <p className="mt-1 text-muted-foreground">{t('dishes.subtitle')}</p>
          </div>
          <Dialog open={dishModalOpen} onOpenChange={setDishModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDish}>
                <Plus className="mr-2 h-4 w-4" />
                {t('dishes.new')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDish ? t('dishes.edit') : t('dishes.new')}
                </DialogTitle>
                <DialogDescription>
                  {t('dishes.form_description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="dishName">{t('dishes.name')}</Label>
                  <Input
                    id="dishName"
                    placeholder={t('dishes.name_placeholder')}
                    value={dishForm.name}
                    onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dishDescription">{t('dishes.description')}</Label>
                    <Textarea
                      id="dishDescription"
                      placeholder={t('dishes.description_placeholder')}
                      value={dishForm.description}
                      onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dishPrice">{t('dishes.price')} (€)</Label>
                    <Input
                      id="dishPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={t('dishes.price_placeholder')}
                      value={dishForm.price}
                      onChange={(e) => setDishForm({ ...dishForm, price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* PDV Category */}
                <div className="space-y-2">
                  <Label>{t('dishes.sale_category')} *</Label>
                  <Select
                    value={dishForm.pos_category_id || 'none'}
                    onValueChange={(value) => {
                      if (value === '__new__') {
                        setCreatingPosCategory(true);
                      } else {
                        setDishForm({ ...dishForm, pos_category_id: value === 'none' ? '' : value });
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
                          {cat.name}
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
                            const { data, error } = await supabase.from('pos_categories').insert({ name: newPosCategoryName.trim(), restaurant_id: restaurantId }).select().single();
                            if (!error && data) {
                              // Auto-sync: also create stock category
                              await supabase.from('categories').insert({ name: newPosCategoryName.trim(), restaurant_id: restaurantId });
                              setPosCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                              setDishForm(f => ({ ...f, pos_category_id: data.id }));
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
                          const { data, error } = await supabase.from('pos_categories').insert({ name: newPosCategoryName.trim(), restaurant_id: restaurantId }).select().single();
                          if (!error && data) {
                            // Auto-sync: also create stock category
                            await supabase.from('categories').insert({ name: newPosCategoryName.trim(), restaurant_id: restaurantId });
                            setPosCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                            setDishForm(f => ({ ...f, pos_category_id: data.id }));
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

                {/* Ingredients Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('dishes.ingredients')}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addIngredient}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {t('dishes.add_ingredient')}
                    </Button>
                  </div>

                  {ingredients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
                      {t('dishes.no_ingredients')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ingredients.map((ing, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30"
                        >
                          <Select
                            value={ing.item_id}
                            onValueChange={(value) => updateIngredient(index, 'item_id', value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder={t('dishes.select_ingredient')} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableItemsForIngredient(index).map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} ({item.unit})
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
                            onChange={(e) =>
                              updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-24"
                          />
                          {ing.item_id && (
                            (() => {
                              const availableUnits = getAvailableUnits(ing.item_id);
                              return availableUnits.length > 1 ? (
                                <Select
                                  value={ing.unit || getItemById(ing.item_id)?.unit || ''}
                                  onValueChange={(value) => updateIngredient(index, 'unit', value)}
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableUnits.map((u) => (
                                      <SelectItem key={u.value} value={u.value}>
                                        {u.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-muted-foreground w-12">
                                  {ing.unit || getItemById(ing.item_id)?.unit}
                                </span>
                              );
                            })()
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeIngredient(index)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveDish}
                  disabled={processingAction}
                >
                  {processingAction ? t('common.saving') : editingDish ? t('inventory.save_changes') : t('dishes.create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dishes List */}
        {dishes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">{t('dishes.no_dishes')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('dishes.no_dishes_desc')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dishes.map((dish) => {
              const dishIngredients = getDishIngredients(dish.id);
              const ingredientCount = dishIngredients.length;

              return (
                <Card key={dish.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{dish.name}</CardTitle>
                        {dish.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {dish.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDish(dish)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDish(dish.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          {t('dishes.ingredients')} ({ingredientCount})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {dishIngredients.slice(0, 4).map((ing) => {
                            const item = getItemById(ing.item_id);
                            return item ? (
                              <Badge key={ing.id} variant="secondary" className="text-xs">
                                {item.name}: {ing.quantity_per_sale} {item.unit}
                              </Badge>
                            ) : null;
                          })}
                          {ingredientCount > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{ingredientCount - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0">
                    <Button
                      className="w-full"
                      variant="default"
                      onClick={() => openSaleModal(dish)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {t('dishes.launch_sale')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Sale Modal */}
        <Dialog open={saleModalOpen} onOpenChange={setSaleModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dishes.sale_title')}</DialogTitle>
              <DialogDescription>
                {selectedDishForSale?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="saleQuantity">{t('dishes.sale_quantity')}</Label>
                <Input
                  id="saleQuantity"
                  type="number"
                  min="1"
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              {/* Stock Issues Warning */}
              {stockIssues.length > 0 && (
                <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">{t('dishes.insufficient_stock')}</span>
                  </div>
                   <ul className="space-y-1 text-sm">
                     {stockIssues.map((issue, index) => (
                       <li key={index} className="text-destructive">
                         {t('dishes.stock_issue_item')
                           .replace('{name}', issue.itemName)
                           .replace('{needed}', formatQuantity(issue.needed))
                           .replace('{available}', formatQuantity(issue.available))
                           .replace('{unit}', issue.unit)}
                       </li>
                     ))}
                   </ul>
                </div>
              )}

              {/* Ingredients Preview */}
              {selectedDishForSale && (
                <div className="space-y-2">
                  <Label>{t('dishes.ingredients_to_deduct')}</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('table.product')}</TableHead>
                        <TableHead className="text-right">{t('dishes.quantity')}</TableHead>
                        <TableHead className="text-right">{t('shopping.current')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {getDishIngredients(selectedDishForSale.id).map((ing) => {
                         const item = getItemById(ing.item_id);
                         if (!item) return null;
                         const neededInPurchase = convertToPurchaseUnits(ing.quantity_per_sale * saleQuantity, item, ing.unit);
                         const isInsufficient = item.current_stock < neededInPurchase;
                         return (
                           <TableRow key={ing.id}>
                             <TableCell>{item.name}</TableCell>
                             <TableCell className={`text-right ${isInsufficient ? 'text-destructive font-medium' : ''}`}>
                               {formatQuantity(neededInPurchase)} {item.unit}
                             </TableCell>
                             <TableCell className="text-right text-muted-foreground">
                               {formatQuantity(item.current_stock)} {item.unit}
                             </TableCell>
                           </TableRow>
                         );
                       })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handlePrepareSale}
                disabled={processingAction || stockIssues.length > 0}
              >
                {t('dishes.confirm_sale')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sale Destination Modal */}
        <SaleDestinationModal
          open={destinationModalOpen}
          onOpenChange={setDestinationModalOpen}
          onConfirm={handleConfirmSale}
          dishName={selectedDishForSale?.name || ''}
          quantity={saleQuantity}
        />
      </div>
    </DashboardLayout>
  );
}
