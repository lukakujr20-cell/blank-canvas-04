import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface RestaurantTable {
  id: string;
  table_number: number;
  capacity: number;
  status: string;
  restaurant_id: string | null;
}

interface TableManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTablesUpdated: () => void;
}

export default function TableManagementModal({
  open,
  onOpenChange,
  onTablesUpdated,
}: TableManagementModalProps) {
  const { user, restaurantId } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [formOpen, setFormOpen] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<RestaurantTable | null>(null);

  useEffect(() => {
    if (open) {
      fetchTables();
    }
  }, [open]);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: t('common.error'),
        description: t('dining.load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openNewTableForm = () => {
    setEditingTable(null);
    const nextNumber = tables.length > 0 
      ? Math.max(...tables.map(t => t.table_number)) + 1 
      : 1;
    setTableNumber(nextNumber.toString());
    setCapacity('4');
    setFormOpen(true);
  };

  const openEditForm = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableNumber(table.table_number.toString());
    setCapacity(table.capacity.toString());
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!tableNumber || !capacity) {
      toast({
        title: t('common.error'),
        description: t('common.fill_required'),
        variant: 'destructive',
      });
      return;
    }

    const num = parseInt(tableNumber);
    const cap = parseInt(capacity);

    if (isNaN(num) || num <= 0) {
      toast({
        title: t('common.error'),
        description: t('dining.invalid_table_number'),
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(cap) || cap <= 0) {
      toast({
        title: t('common.error'),
        description: t('dining.invalid_capacity'),
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate table number (excluding current table if editing)
    const duplicate = tables.find(
      t => t.table_number === num && (!editingTable || t.id !== editingTable.id)
    );
    if (duplicate) {
      toast({
        title: t('common.error'),
        description: t('dining.table_number_exists'),
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingTable) {
        // Update existing table
        const { error } = await supabase
          .from('restaurant_tables')
          .update({
            table_number: num,
            capacity: cap,
          })
          .eq('id', editingTable.id);

        if (error) throw error;
        toast({ title: t('dining.table_updated') });
      } else {
        // Create new table
        const { error } = await supabase
          .from('restaurant_tables')
          .insert({
            table_number: num,
            capacity: cap,
            status: 'free',
            restaurant_id: restaurantId,
          });

        if (error) throw error;
        toast({ title: t('dining.table_created') });
      }

      setFormOpen(false);
      fetchTables();
      onTablesUpdated();
    } catch (error) {
      console.error('Error saving table:', error);
      toast({
        title: t('common.error'),
        description: editingTable ? t('dining.update_error') : t('dining.create_error'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (table: RestaurantTable) => {
    if (table.status === 'occupied') {
      toast({
        title: t('common.error'),
        description: t('dining.cannot_delete_occupied'),
        variant: 'destructive',
      });
      return;
    }
    setTableToDelete(table);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!tableToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .delete()
        .eq('id', tableToDelete.id);

      if (error) throw error;

      toast({ title: t('dining.table_deleted') });
      setDeleteConfirmOpen(false);
      setTableToDelete(null);
      fetchTables();
      onTablesUpdated();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast({
        title: t('common.error'),
        description: t('dining.delete_error'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('dining.manage_tables')}</DialogTitle>
            <DialogDescription>{t('dining.manage_tables_desc')}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add new table button */}
              <Button onClick={openNewTableForm} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                {t('dining.add_table')}
              </Button>

              {/* Tables list */}
              {tables.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {t('dining.no_tables')}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {tables.map(table => (
                    <Card key={table.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-semibold">
                            {t('dining.table')} {table.table_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {table.capacity} {t('dining.seats')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditForm(table)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteClick(table)}
                            disabled={table.status === 'occupied'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? t('dining.edit_table') : t('dining.add_table')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tableNumber">{t('dining.table_number')}</Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">{t('dining.capacity')}</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="50"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                placeholder="4"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dining.delete_table_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dining.delete_table_confirm').replace('{number}', String(tableToDelete?.table_number || ''))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
