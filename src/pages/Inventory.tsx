import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  FolderPlus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Package,
  CalendarIcon,
  Save,
  ShoppingCart,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Category {
  id: string;
  name: string;
  created_at: string;
}

interface PosCategory {
  id: string;
  name: string;
}

interface Item {
  id: string;
  category_id: string;
  name: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  expiry_date: string | null;
  last_count_date: string | null;
  last_counted_by: string | null;
  supplier_id: string | null;
  units_per_package: number;
  direct_sale: boolean | null;
  price: number | null;
  sub_unit: string | null;
  recipe_unit: string | null;
  recipe_units_per_consumption: number | null;
}

interface Supplier {
  id: string;
  name: string;
  whatsapp: string;
}

interface Profile {
  id: string;
  full_name: string;
}

import { GASTRO_UNIT_GROUPS, ALL_UNITS, getUnitLabel } from '@/lib/unitConversions';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Inventory() {
  const { t } = useLanguage();
  const { user, isHost, isKitchen, isAdmin, restaurantId } = useAuth();
  const isReadOnly = isKitchen;
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [posCategories, setPosCategories] = useState<PosCategory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Inline editing state for host/super_admin
  const [inlineEdits, setInlineEdits] = useState<Map<string, { current_stock?: number; expiry_date?: string | null }>>(new Map());
  const [savingInline, setSavingInline] = useState<Set<string>>(new Set());

  // Modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [alsoCreateInPos, setAlsoCreateInPos] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category_id: '',
    unit: 'un',
    min_stock: 0,
    supplier_id: '',
    units_per_package: 1,
    direct_sale: false,
    price: 0,
    pos_category_id: '',
    sub_unit: '',
    recipe_unit: '',
    recipe_units_per_consumption: 0,
    showRecipeUnit: false,
  });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Delete confirmation state
  const [deleteCategoryAlert, setDeleteCategoryAlert] = useState<{ id: string; name: string; itemCount: number } | null>(null);
  const [deleteItemAlert, setDeleteItemAlert] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes, profilesRes, suppliersRes, posCategoriesRes] = await Promise.all([
        supabase.from('categories').select('*').is('deleted_at', null).order('name'),
        supabase.from('items').select('*').is('deleted_at', null).order('name'),
        supabase.from('profiles').select('*'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('pos_categories').select('id, name').order('name'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setCategories(categoriesRes.data || []);
      setItems(itemsRes.data || []);
      setProfiles(profilesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setPosCategories(posCategoriesRes.data || []);
      // Expand all categories by default
      setExpandedCategories(new Set((categoriesRes.data || []).map(c => c.id)));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('inventory.error_loading'),
        description: t('inventory.error_loading_desc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    if (!restaurantId) {
      toast({
        title: t('inventory.error_config'),
        description: t('inventory.error_config_desc'),
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate within the same restaurant
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      toast({
        title: t('inventory.category_exists'),
        description: `"${trimmedName}"`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('categories').insert({
        name: trimmedName,
        restaurant_id: restaurantId,
      });

      if (error) {
        console.error('Error creating category:', error);
        if (error.code === '42501') {
          toast({
            title: t('inventory.no_permission'),
            description: t('inventory.no_permission_desc'),
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('inventory.error_create_category'),
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      // Auto-sync: optionally create in POS too
      if (alsoCreateInPos) {
        const { error: posError } = await supabase.from('pos_categories').insert({
          name: trimmedName,
          restaurant_id: restaurantId,
          destination: 'kitchen',
        });
        if (!posError) {
          toast({ title: t('inventory.category_synced_pos') });
        }
      }

      toast({ title: t('inventory.category_created') });
      setNewCategoryName('');
      setAlsoCreateInPos(false);
      setCategoryModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        title: t('inventory.error_connection'),
        description: t('inventory.error_connection_desc'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: newCategoryName.trim() })
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast({ title: t('inventory.category_updated') });
      setNewCategoryName('');
      setEditingCategory(null);
      setCategoryModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: t('inventory.error_update_category'),
        variant: 'destructive',
      });
    }
  };

  const promptDeleteCategory = (category: Category) => {
    const count = items.filter(i => i.category_id === category.id).length;
    setDeleteCategoryAlert({ id: category.id, name: category.name, itemCount: count });
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryAlert) return;
    try {
      const now = new Date().toISOString();
      // Soft delete: set deleted_at on category and its items
      await supabase.from('items').update({ deleted_at: now }).eq('category_id', deleteCategoryAlert.id);
      const { error } = await supabase.from('categories').update({ deleted_at: now }).eq('id', deleteCategoryAlert.id);
      if (error) throw error;

      toast({ title: t('inventory.category_deleted') });
      setDeleteCategoryAlert(null);
      fetchData();
    } catch (error) {
      console.error('Error archiving category:', error);
      toast({ title: t('inventory.error_delete_category'), variant: 'destructive' });
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.name.trim() || !newItem.category_id) return;

    try {
      if (!restaurantId) {
        toast({
          title: t('inventory.error_config'),
          description: t('inventory.error_config_desc'),
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('items').insert({
        name: newItem.name.trim(),
        category_id: newItem.category_id,
        unit: newItem.unit,
        min_stock: newItem.min_stock,
        units_per_package: newItem.units_per_package,
        supplier_id: newItem.supplier_id && newItem.supplier_id !== 'none' ? newItem.supplier_id : null,
        direct_sale: newItem.direct_sale,
        price: newItem.direct_sale ? newItem.price : null,
        pos_category_id: newItem.direct_sale && newItem.pos_category_id ? newItem.pos_category_id : null,
        sub_unit: newItem.sub_unit || null,
        recipe_unit: newItem.showRecipeUnit && newItem.recipe_unit ? newItem.recipe_unit : null,
        recipe_units_per_consumption: newItem.showRecipeUnit && newItem.recipe_units_per_consumption > 0 ? newItem.recipe_units_per_consumption : null,
        restaurant_id: restaurantId,
      });

      if (error) throw error;

      toast({ title: t('inventory.item_created') });
      setNewItem({ name: '', category_id: '', unit: 'un', min_stock: 0, supplier_id: '', units_per_package: 1, direct_sale: false, price: 0, pos_category_id: '', sub_unit: '', recipe_unit: '', recipe_units_per_consumption: 0, showRecipeUnit: false });
      setItemModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: t('inventory.error_create_item'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: newItem.name.trim(),
          unit: newItem.unit,
          min_stock: newItem.min_stock,
          units_per_package: newItem.units_per_package,
          supplier_id: newItem.supplier_id && newItem.supplier_id !== 'none' ? newItem.supplier_id : null,
          direct_sale: newItem.direct_sale,
          price: newItem.direct_sale ? newItem.price : null,
          pos_category_id: newItem.direct_sale && newItem.pos_category_id ? newItem.pos_category_id : null,
          sub_unit: newItem.sub_unit || null,
          recipe_unit: newItem.showRecipeUnit && newItem.recipe_unit ? newItem.recipe_unit : null,
          recipe_units_per_consumption: newItem.showRecipeUnit && newItem.recipe_units_per_consumption > 0 ? newItem.recipe_units_per_consumption : null,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({ title: t('inventory.item_updated') });
      setNewItem({ name: '', category_id: '', unit: 'un', min_stock: 0, supplier_id: '', units_per_package: 1, direct_sale: false, price: 0, pos_category_id: '', sub_unit: '', recipe_unit: '', recipe_units_per_consumption: 0, showRecipeUnit: false });
      setEditingItem(null);
      setItemModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: t('inventory.error_update_item'),
        variant: 'destructive',
      });
    }
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return '-';
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.name || '-';
  };

  const promptDeleteItem = (item: Item) => {
    setDeleteItemAlert({ id: item.id, name: item.name });
  };

  const handleDeleteItem = async () => {
    if (!deleteItemAlert) return;
    try {
      // Soft delete: set deleted_at
      const { error } = await supabase.from('items').update({ deleted_at: new Date().toISOString() }).eq('id', deleteItemAlert.id);
      if (error) throw error;

      toast({ title: t('inventory.item_deleted') });
      setDeleteItemAlert(null);
      fetchData();
    } catch (error) {
      console.error('Error archiving item:', error);
      toast({ title: t('inventory.error_delete_item'), variant: 'destructive' });
    }
  };

  // Restore functions
  const handleRestoreCategory = async (categoryId: string) => {
    try {
      await supabase.from('items').update({ deleted_at: null }).eq('category_id', categoryId);
      const { error } = await supabase.from('categories').update({ deleted_at: null }).eq('id', categoryId);
      if (error) throw error;
      toast({ title: t('inventory.category_restored') });
      fetchArchivedData();
      fetchData();
    } catch (error) {
      console.error('Error restoring category:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleRestoreItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('items').update({ deleted_at: null }).eq('id', itemId);
      if (error) throw error;
      toast({ title: t('inventory.item_restored') });
      fetchArchivedData();
      fetchData();
    } catch (error) {
      console.error('Error restoring item:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  // Archived data
  const [archivedCategories, setArchivedCategories] = useState<Category[]>([]);
  const [archivedItems, setArchivedItems] = useState<Item[]>([]);

  const fetchArchivedData = async () => {
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from('categories').select('*').not('deleted_at', 'is', null).order('name'),
      supabase.from('items').select('*').not('deleted_at', 'is', null).order('name'),
    ]);
    setArchivedCategories(catsRes.data || []);
    setArchivedItems(itemsRes.data || []);
  };

  useEffect(() => {
    if (showArchived) fetchArchivedData();
  }, [showArchived]);

  const getRowClassName = (item: Item) => {
    if (item.expiry_date) {
      const daysUntilExpiry = differenceInDays(parseISO(item.expiry_date), new Date());
      if (daysUntilExpiry <= 1 && daysUntilExpiry >= 0) {
        return 'stock-danger';
      }
    }
    return '';
  };

  const getStockCellClassName = (item: Item) => {
    if (item.current_stock < item.min_stock) {
      return 'stock-warning';
    }
    return '';
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return '-';
    const profile = profiles.find((p) => p.id === userId);
    return profile?.full_name || t('inventory.user');
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setCategoryModalOpen(true);
  };

  const openEditItem = (item: Item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category_id: item.category_id,
      unit: item.unit,
      min_stock: item.min_stock,
      supplier_id: item.supplier_id || 'none',
      units_per_package: item.units_per_package || 1,
      direct_sale: item.direct_sale || false,
      price: item.price || 0,
      pos_category_id: (item as any).pos_category_id || '',
      sub_unit: item.sub_unit || '',
      recipe_unit: item.recipe_unit || '',
      recipe_units_per_consumption: item.recipe_units_per_consumption || 0,
      showRecipeUnit: !!(item.recipe_unit),
    });
    setItemModalOpen(true);
  };

  const openAddItem = (categoryId: string) => {
    setEditingItem(null);
    setNewItem({ name: '', category_id: categoryId, unit: 'un', min_stock: 0, supplier_id: '', units_per_package: 1, direct_sale: false, price: 0, pos_category_id: '', sub_unit: '', recipe_unit: '', recipe_units_per_consumption: 0, showRecipeUnit: false });
    setItemModalOpen(true);
  };

  // Inline editing handlers for host/super_admin
  const handleInlineStockChange = (itemId: string, value: string) => {
    const newStock = parseFloat(value) || 0;
    setInlineEdits(prev => {
      const updated = new Map(prev);
      const existing = updated.get(itemId) || {};
      updated.set(itemId, { ...existing, current_stock: newStock });
      return updated;
    });
  };

  const handleInlineExpiryChange = (itemId: string, date: Date | undefined) => {
    const newExpiry = date ? format(date, 'yyyy-MM-dd') : null;
    setInlineEdits(prev => {
      const updated = new Map(prev);
      const existing = updated.get(itemId) || {};
      updated.set(itemId, { ...existing, expiry_date: newExpiry });
      return updated;
    });
  };

  const saveInlineEdit = async (itemId: string) => {
    const edits = inlineEdits.get(itemId);
    if (!edits) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setSavingInline(prev => new Set(prev).add(itemId));
    const today = format(new Date(), 'yyyy-MM-dd');
    const newStock = edits.current_stock ?? item.current_stock;
    const newExpiry = edits.expiry_date !== undefined ? edits.expiry_date : item.expiry_date;

    try {
      const { error } = await supabase
        .from('items')
        .update({
          current_stock: newStock,
          expiry_date: newExpiry,
          last_count_date: today,
          last_counted_by: user?.id,
        })
        .eq('id', itemId);

      if (error) throw error;

      const stockDiff = newStock - item.current_stock;
      await supabase.from('stock_history').insert({
        item_id: itemId,
        previous_stock: item.current_stock,
        new_stock: newStock,
        previous_expiry: item.expiry_date,
        new_expiry: newExpiry,
        changed_by: user?.id,
        movement_type: stockDiff > 0 ? 'entry' : stockDiff < 0 ? 'adjustment' : 'adjustment',
        reason: t('inventory.stock_reason'),
      });

      toast({ title: t('inventory.item_saved') });
      setInlineEdits(prev => {
        const updated = new Map(prev);
        updated.delete(itemId);
        return updated;
      });
      fetchData();
    } catch (error) {
      console.error('Error saving inline edit:', error);
      toast({ title: t('inventory.error_save_inline'), variant: 'destructive' });
    } finally {
      setSavingInline(prev => {
        const updated = new Set(prev);
        updated.delete(itemId);
        return updated;
      });
    }
  };

  const getInlineStock = (item: Item) => {
    const edits = inlineEdits.get(item.id);
    return edits?.current_stock ?? item.current_stock;
  };

  const getInlineExpiry = (item: Item) => {
    const edits = inlineEdits.get(item.id);
    return edits?.expiry_date !== undefined ? edits.expiry_date : item.expiry_date;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {isReadOnly ? t('inventory.title_readonly') : t('inventory.title')}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isReadOnly
                ? t('inventory.subtitle_readonly')
                : t('inventory.subtitle')}
            </p>
          </div>
          {!isReadOnly && (
            <div className="flex gap-2">
              <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCategory(null);
                      setNewCategoryName('');
                    }}
                  >
                    <FolderPlus className="mr-2 h-4 w-4" />
                    {t('inventory.new_category')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? t('inventory.edit_category') : t('inventory.new_category')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryName">{t('inventory.category_name')}</Label>
                      <Input
                        id="categoryName"
                        placeholder={t('inventory.category_placeholder')}
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                    {!editingCategory && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="alsoCreateInPos"
                          checked={alsoCreateInPos}
                          onCheckedChange={(checked) => setAlsoCreateInPos(checked === true)}
                        />
                        <Label htmlFor="alsoCreateInPos" className="text-sm font-normal cursor-pointer">
                          {t('inventory.also_create_pos')}
                        </Label>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                    >
                      {editingCategory ? t('inventory.save_changes') : t('inventory.create_category')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Item Modal */}
        <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? t('inventory.edit_item') : t('inventory.new_item')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">{t('inventory.product_name')}</Label>
                <Input
                  id="itemName"
                  placeholder={t('inventory.product_placeholder')}
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              {!editingItem && (
                <div className="space-y-2">
                  <Label>{t('inventory.category')}</Label>
                  <Select
                    value={newItem.category_id}
                    onValueChange={(value) =>
                      setNewItem({ ...newItem, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('inventory.select_category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('inventory.purchase_unit')}</Label>
                  <Select
                    value={newItem.unit}
                    onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GASTRO_UNIT_GROUPS.map((group) => (
                        <div key={group.label}>
                          <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
                          {group.units.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">{t('inventory.min_stock')}</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={newItem.min_stock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, min_stock: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* Level 2: Units per package + sub-unit */}
              <div className="space-y-2">
                <Label>{t('inventory.units_per_pack')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('inventory.how_many_consumption')} <strong>{getUnitLabel(newItem.unit)}</strong>?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={newItem.units_per_package}
                    onChange={(e) =>
                      setNewItem({ ...newItem, units_per_package: Math.max(1, Number(e.target.value)) })
                    }
                  />
                  <Select
                    value={newItem.sub_unit || 'un'}
                    onValueChange={(value) => setNewItem({ ...newItem, sub_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('inventory.sub_unit_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {GASTRO_UNIT_GROUPS.map((group) => (
                        <div key={group.label}>
                          <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
                          {group.units.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newItem.units_per_package > 1 && (
                  <p className="text-xs text-primary">
                    1 {getUnitLabel(newItem.unit)} = {newItem.units_per_package} {getUnitLabel(newItem.sub_unit || 'un')}
                  </p>
                )}
              </div>

              {/* Level 3: Recipe unit (optional) */}
              {!newItem.showRecipeUnit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setNewItem({ ...newItem, showRecipeUnit: true, recipe_unit: newItem.recipe_unit || 'fatia' })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('inventory.add_recipe_measurement')}
                </Button>
              ) : (
                <div className="space-y-2 rounded-lg border border-dashed p-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('inventory.recipe_measurement')}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewItem({ ...newItem, showRecipeUnit: false, recipe_unit: '', recipe_units_per_consumption: 0 })}
                    >
                      {t('inventory.remove')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('inventory.each')} <strong>{getUnitLabel(newItem.sub_unit || 'un')}</strong> {t('inventory.how_many_recipe')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Ex: 20"
                      value={newItem.recipe_units_per_consumption || ''}
                      onChange={(e) =>
                        setNewItem({ ...newItem, recipe_units_per_consumption: Number(e.target.value) })
                      }
                    />
                    <Select
                      value={newItem.recipe_unit || 'fatia'}
                      onValueChange={(value) => setNewItem({ ...newItem, recipe_unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('inventory.recipe_unit_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {GASTRO_UNIT_GROUPS.map((group) => (
                          <div key={group.label}>
                            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
                            {group.units.map((u) => (
                              <SelectItem key={u.value} value={u.value}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newItem.recipe_units_per_consumption > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-primary">
                        1 {getUnitLabel(newItem.sub_unit || 'un')} = {newItem.recipe_units_per_consumption} {getUnitLabel(newItem.recipe_unit || 'fatia')}
                      </p>
                      <p className="text-xs font-medium text-primary">
                        {t('inventory.total')}: 1 {getUnitLabel(newItem.unit)} = {newItem.units_per_package * newItem.recipe_units_per_consumption} {getUnitLabel(newItem.recipe_unit || 'fatia')}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Direct Sale */}
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <Checkbox
                  id="directSale"
                  checked={newItem.direct_sale}
                  onCheckedChange={(checked) =>
                    setNewItem({ ...newItem, direct_sale: !!checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="directSale" className="cursor-pointer font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    {t('inventory.direct_sale')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('inventory.direct_sale_desc')}
                  </p>
                </div>
              </div>
              {newItem.direct_sale && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">{t('inventory.sale_price')} (€)</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 2.50"
                      value={newItem.price}
                      onChange={(e) =>
                        setNewItem({ ...newItem, price: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('inventory.sale_category')}</Label>
                    <Select
                      value={newItem.pos_category_id || 'none'}
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, pos_category_id: value === 'none' ? '' : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('inventory.select_sale_category')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('inventory.none')}</SelectItem>
                        {posCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('inventory.sale_category_hint')}
                    </p>
                  </div>
                </>
              )}
              {suppliers.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('inventory.supplier')}</Label>
                  <Select
                    value={newItem.supplier_id}
                    onValueChange={(value) =>
                      setNewItem({ ...newItem, supplier_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('inventory.supplier_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('inventory.supplier_none')}</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="w-full"
                onClick={editingItem ? handleUpdateItem : handleCreateItem}
              >
                {editingItem ? t('inventory.save_changes') : t('inventory.create_item')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Categories and Items */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">{t('inventory.no_categories')}</h3>
              <p className="mt-2 text-center text-muted-foreground">
                {t('inventory.start_creating')}
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setCategoryModalOpen(true);
                }}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                {t('inventory.create_category')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => {
              const categoryItems = items.filter((i) => i.category_id === category.id);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <Card key={category.id} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer bg-table-header hover:bg-muted/50 transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <CardTitle className="text-lg uppercase tracking-wide">
                          {category.name}
                        </CardTitle>
                        <span className="text-sm font-normal text-muted-foreground">
                          ({categoryItems.length} {categoryItems.length === 1 ? t('inventory.item') : t('inventory.items')})
                        </span>
                      </div>
                      {!isReadOnly && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAddItem(category.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditCategory(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => promptDeleteCategory(category)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="p-0">
                      {categoryItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <p>{t('inventory.no_items_category')}</p>
                          {!isReadOnly && (
                            <Button
                              variant="link"
                              onClick={() => openAddItem(category.id)}
                            >
                              {t('inventory.add_first_item')}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-table-header">
                                <TableHead className="font-semibold">{t('inventory.th_product')}</TableHead>
                                <TableHead className="font-semibold">{t('inventory.th_supplier')}</TableHead>
                                <TableHead className="font-semibold">{t('inventory.th_unit')}</TableHead>
                                <TableHead className="font-semibold">{t('inventory.th_min_stock')}</TableHead>
                                <TableHead className="font-semibold">{t('inventory.th_current_qty')}</TableHead>
                                <TableHead className="font-semibold">{t('inventory.th_count_date')}</TableHead>
                                <TableHead className="font-semibold">{t('inventory.th_expiry')}</TableHead>
                                <TableHead className="font-semibold">{t('inventory.th_responsible')}</TableHead>
                                {!isReadOnly && <TableHead className="w-[100px]"></TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {categoryItems.map((item, index) => (
                                <TableRow
                                  key={item.id}
                                  className={cn(
                                    getRowClassName(item),
                                    index % 2 === 1 && !getRowClassName(item) && 'bg-table-row-alt'
                                  )}
                                >
                                  <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{getSupplierName(item.supplier_id)}</TableCell>
                                  <TableCell>{item.unit}</TableCell>
                                  <TableCell>{item.min_stock}</TableCell>
                                  <TableCell className={cn('font-medium', getStockCellClassName(item))}>
                                    {isHost ? (
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={getInlineStock(item)}
                                        onChange={(e) => handleInlineStockChange(item.id, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && inlineEdits.has(item.id)) {
                                            saveInlineEdit(item.id);
                                          }
                                        }}
                                        className="h-8 w-20 bg-background"
                                      />
                                    ) : (
                                      item.current_stock
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {item.last_count_date
                                      ? format(parseISO(item.last_count_date), 'dd/MM/yyyy', { locale: ptBR })
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {isHost ? (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                              'w-[130px] justify-start text-left font-normal h-8',
                                              !getInlineExpiry(item) && 'text-muted-foreground'
                                            )}
                                          >
                                            <CalendarIcon className="mr-1 h-3 w-3" />
                                            {getInlineExpiry(item)
                                              ? format(parseISO(getInlineExpiry(item)!), 'dd/MM/yyyy')
                                              : t('inventory.select_date')}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                            mode="single"
                                            selected={getInlineExpiry(item) ? parseISO(getInlineExpiry(item)!) : undefined}
                                            onSelect={(date) => handleInlineExpiryChange(item.id, date)}
                                            initialFocus
                                            className="p-3 pointer-events-auto"
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    ) : (
                                      item.expiry_date
                                        ? format(parseISO(item.expiry_date), 'dd/MM/yyyy', { locale: ptBR })
                                        : '-'
                                    )}
                                  </TableCell>
                                  <TableCell>{getProfileName(item.last_counted_by)}</TableCell>
                                  {!isReadOnly && (
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        {isHost && inlineEdits.has(item.id) && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => saveInlineEdit(item.id)}
                                            disabled={savingInline.has(item.id)}
                                            className="h-8 px-3 gap-1"
                                          >
                                            <Save className="h-4 w-4" />
                                            {t('inventory.save')}
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openEditItem(item)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => promptDeleteItem(item)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
          </div>
        )}

        {/* Archived Toggle */}
        {!isReadOnly && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="gap-2"
            >
              {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {showArchived ? t('inventory.hide_archived') : t('inventory.show_archived')}
            </Button>
          </div>
        )}

        {/* Archived Section */}
        {showArchived && (archivedCategories.length > 0 || archivedItems.length > 0) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
              <Archive className="h-5 w-5" />
              {t('inventory.archived_tab')}
            </h2>
            {archivedCategories.map((category) => {
              const catItems = archivedItems.filter(i => i.category_id === category.id);
              return (
                <Card key={category.id} className="opacity-60 border-dashed">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg uppercase tracking-wide line-through">
                          {category.name}
                        </CardTitle>
                        <Badge variant="secondary">{t('inventory.archived_label')}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ({catItems.length} {catItems.length === 1 ? t('inventory.item') : t('inventory.items')})
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleRestoreCategory(category.id)} className="gap-1">
                        <ArchiveRestore className="h-4 w-4" />
                        {t('inventory.restore')}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
            {/* Orphan archived items (category still active but item archived) */}
            {archivedItems
              .filter(i => !archivedCategories.some(c => c.id === i.category_id))
              .map((item) => (
                <Card key={item.id} className="opacity-60 border-dashed">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium line-through">{item.name}</span>
                      <Badge variant="secondary">{t('inventory.archived_label')}</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRestoreItem(item.id)} className="gap-1">
                      <ArchiveRestore className="h-4 w-4" />
                      {t('inventory.restore')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Category AlertDialog */}
      <AlertDialog open={!!deleteCategoryAlert} onOpenChange={(open) => !open && setDeleteCategoryAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.delete_category_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory.delete_category_warning')
                .replace('{name}', deleteCategoryAlert?.name || '')
                .replace('{count}', String(deleteCategoryAlert?.itemCount || 0))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('inventory.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('inventory.delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item AlertDialog */}
      <AlertDialog open={!!deleteItemAlert} onOpenChange={(open) => !open && setDeleteItemAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.delete_item_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory.delete_item_warning').replace('{name}', deleteItemAlert?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('inventory.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('inventory.delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
