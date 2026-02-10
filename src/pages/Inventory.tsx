import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Category {
  id: string;
  name: string;
  created_at: string;
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

const UNITS = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'dz'];

export default function Inventory() {
  const { user, isHost, isKitchen, isAdmin } = useAuth();
  const isReadOnly = isKitchen;
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Inline editing state for host/super_admin
  const [inlineEdits, setInlineEdits] = useState<Map<string, { current_stock?: number; expiry_date?: string | null }>>(new Map());
  const [savingInline, setSavingInline] = useState<Set<string>>(new Set());

  // Modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    category_id: '',
    unit: 'un',
    min_stock: 0,
    supplier_id: '',
    units_per_package: 1,
  });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes, profilesRes, suppliersRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('items').select('*').order('name'),
        supabase.from('profiles').select('*'),
        supabase.from('suppliers').select('*').order('name'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setCategories(categoriesRes.data || []);
      setItems(itemsRes.data || []);
      setProfiles(profilesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      
      // Expand all categories by default
      setExpandedCategories(new Set((categoriesRes.data || []).map(c => c.id)));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do estoque.',
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
    if (!newCategoryName.trim()) return;

    try {
      const { error } = await supabase.from('categories').insert({
        name: newCategoryName.trim(),
      });

      if (error) throw error;

      toast({ title: 'Categoria criada com sucesso!' });
      setNewCategoryName('');
      setCategoryModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: 'Erro ao criar categoria',
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

      toast({ title: 'Categoria atualizada!' });
      setNewCategoryName('');
      setEditingCategory(null);
      setCategoryModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Erro ao atualizar categoria',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Tem certeza? Isso irá excluir todos os itens desta categoria.')) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;

      toast({ title: 'Categoria excluída!' });
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Erro ao excluir categoria',
        variant: 'destructive',
      });
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.name.trim() || !newItem.category_id) return;

    try {
      const { error } = await supabase.from('items').insert({
        name: newItem.name.trim(),
        category_id: newItem.category_id,
        unit: newItem.unit,
        min_stock: newItem.min_stock,
        units_per_package: newItem.units_per_package,
        supplier_id: newItem.supplier_id && newItem.supplier_id !== 'none' ? newItem.supplier_id : null,
      });

      if (error) throw error;

      toast({ title: 'Item criado com sucesso!' });
      setNewItem({ name: '', category_id: '', unit: 'un', min_stock: 0, supplier_id: '', units_per_package: 1 });
      setItemModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: 'Erro ao criar item',
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
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({ title: 'Item atualizado!' });
      setNewItem({ name: '', category_id: '', unit: 'un', min_stock: 0, supplier_id: '', units_per_package: 1 });
      setEditingItem(null);
      setItemModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Erro ao atualizar item',
        variant: 'destructive',
      });
    }
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return '-';
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.name || '-';
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) throw error;

      toast({ title: 'Item excluído!' });
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Erro ao excluir item',
        variant: 'destructive',
      });
    }
  };

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
    return profile?.full_name || 'Usuário';
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
    });
    setItemModalOpen(true);
  };

  const openAddItem = (categoryId: string) => {
    setEditingItem(null);
    setNewItem({ name: '', category_id: categoryId, unit: 'un', min_stock: 0, supplier_id: '', units_per_package: 1 });
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
        reason: 'Alteração direta na gestão de estoque',
      });

      toast({ title: 'Item atualizado com sucesso!' });
      setInlineEdits(prev => {
        const updated = new Map(prev);
        updated.delete(itemId);
        return updated;
      });
      fetchData();
    } catch (error) {
      console.error('Error saving inline edit:', error);
      toast({ title: 'Erro ao salvar alteração', variant: 'destructive' });
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
              {isReadOnly ? 'Consulta de Estoque' : 'Gestão de Estoque'}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isReadOnly
                ? 'Visualize os itens e quantidades disponíveis no estoque'
                : 'Cadastre e organize categorias e itens do estoque'}
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
                    Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryName">Nome da categoria</Label>
                      <Input
                        id="categoryName"
                        placeholder="Ex: Proteínas, Laticínios..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                    >
                      {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
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
              <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Nome do produto</Label>
                <Input
                  id="itemName"
                  placeholder="Ex: Carne de sol, Frango..."
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              {!editingItem && (
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={newItem.category_id}
                    onValueChange={(value) =>
                      setNewItem({ ...newItem, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
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
                  <Label>Unidade</Label>
                  <Select
                    value={newItem.unit}
                    onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Estoque mínimo</Label>
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
              <div className="space-y-2">
                <Label htmlFor="unitsPerPackage">Unidades por pacote</Label>
                <p className="text-xs text-muted-foreground">Quantas unidades de consumo vêm em cada unidade de compra?</p>
                <Input
                  id="unitsPerPackage"
                  type="number"
                  min="1"
                  value={newItem.units_per_package}
                  onChange={(e) =>
                    setNewItem({ ...newItem, units_per_package: Math.max(1, Number(e.target.value)) })
                  }
                />
              </div>
              {suppliers.length > 0 && (
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={newItem.supplier_id}
                    onValueChange={(value) =>
                      setNewItem({ ...newItem, supplier_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
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
                {editingItem ? 'Salvar Alterações' : 'Criar Item'}
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
              <h3 className="mt-4 text-lg font-medium">Nenhuma categoria</h3>
              <p className="mt-2 text-center text-muted-foreground">
                Comece criando sua primeira categoria de produtos.
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
                Criar Categoria
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
                          ({categoryItems.length} {categoryItems.length === 1 ? 'item' : 'itens'})
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
                            onClick={() => handleDeleteCategory(category.id)}
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
                          <p>Nenhum item nesta categoria</p>
                          {!isReadOnly && (
                            <Button
                              variant="link"
                              onClick={() => openAddItem(category.id)}
                            >
                              Adicionar primeiro item
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-table-header">
                                <TableHead className="font-semibold">Produto</TableHead>
                                <TableHead className="font-semibold">Fornecedor</TableHead>
                                <TableHead className="font-semibold">Unidade</TableHead>
                                <TableHead className="font-semibold">Est. Mínimo</TableHead>
                                <TableHead className="font-semibold">Qtd Atual</TableHead>
                                <TableHead className="font-semibold">Data Contagem</TableHead>
                                <TableHead className="font-semibold">Validade</TableHead>
                                <TableHead className="font-semibold">Responsável</TableHead>
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
                                              : 'Selecionar'}
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
                                            Salvar
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
                                          onClick={() => handleDeleteItem(item.id)}
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
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
