import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Truck, Phone } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
}

export default function SupplierManagement() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', whatsapp: '' });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: t('common.error'),
        description: t('suppliers.load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatWhatsApp = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as +XX (XX) XXXXX-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
    if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
  };

  const handleWhatsAppChange = (value: string) => {
    setFormData({ ...formData, whatsapp: formatWhatsApp(value) });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.whatsapp.trim()) {
      toast({
        title: t('common.error'),
        description: t('suppliers.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({ name: formData.name.trim(), whatsapp: formData.whatsapp.trim() })
          .eq('id', editingSupplier.id);

        if (error) throw error;
        toast({ title: t('suppliers.updated') });
      } else {
        const { error } = await supabase.from('suppliers').insert({
          name: formData.name.trim(),
          whatsapp: formData.whatsapp.trim(),
          created_by: user?.id,
        });

        if (error) throw error;
        toast({ title: t('suppliers.created') });
      }

      setFormData({ name: '', whatsapp: '' });
      setEditingSupplier(null);
      setModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({
        title: t('common.error'),
        description: t('suppliers.save_error'),
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({ name: supplier.name, whatsapp: supplier.whatsapp });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('suppliers.confirm_delete'))) return;

    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;

      toast({ title: t('suppliers.deleted') });
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: t('common.error'),
        description: t('suppliers.delete_error'),
        variant: 'destructive',
      });
    }
  };

  const openNewModal = () => {
    setEditingSupplier(null);
    setFormData({ name: '', whatsapp: '' });
    setModalOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('suppliers.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('suppliers.description')}</p>
            </div>
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewModal}>
                <Plus className="mr-2 h-4 w-4" />
                {t('suppliers.new')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? t('suppliers.edit') : t('suppliers.new')}
                </DialogTitle>
                <DialogDescription>
                  {t('suppliers.form_description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">{t('suppliers.name')}</Label>
                  <Input
                    id="supplierName"
                    placeholder={t('suppliers.name_placeholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierWhatsApp">{t('suppliers.whatsapp')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="supplierWhatsApp"
                      placeholder="+55 (11) 99999-9999"
                      value={formData.whatsapp}
                      onChange={(e) => handleWhatsAppChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t('suppliers.whatsapp_hint')}</p>
                </div>
                <Button className="w-full" onClick={handleSubmit}>
                  {editingSupplier ? t('common.save') : t('suppliers.create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('suppliers.no_suppliers')}</p>
            <Button variant="link" onClick={openNewModal}>
              {t('suppliers.add_first')}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('suppliers.name')}</TableHead>
                  <TableHead>{t('suppliers.whatsapp')}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.whatsapp}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
