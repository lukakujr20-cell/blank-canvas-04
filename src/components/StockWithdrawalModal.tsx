import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useStockWithdrawal, WithdrawalReason } from '@/hooks/useStockWithdrawal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, ChevronsUpDown, Minus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

interface StockWithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  categories: Category[];
  onWithdrawalComplete: (itemId: string, newStock: number) => void;
  preselectedItemId?: string;
}

export function StockWithdrawalModal({
  open,
  onOpenChange,
  items,
  categories,
  onWithdrawalComplete,
  preselectedItemId,
}: StockWithdrawalModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { processWithdrawal, isProcessing } = useStockWithdrawal();

  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || '');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<WithdrawalReason>('sale');
  const [notes, setNotes] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const selectedItem = useMemo(() => 
    items.find(item => item.id === selectedItemId),
    [items, selectedItemId]
  );

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || '';
  };

  const quantityNum = parseFloat(quantity) || 0;
  const isQuantityValid = quantityNum > 0 && quantityNum <= (selectedItem?.current_stock || 0);
  const wouldBeLowStock = selectedItem && (selectedItem.current_stock - quantityNum) <= selectedItem.min_stock;
  const wouldBeNegative = selectedItem && quantityNum > selectedItem.current_stock;

  const handleSubmit = async () => {
    if (!selectedItem || !isQuantityValid) return;

    const result = await processWithdrawal(
      {
        itemId: selectedItemId,
        quantity: quantityNum,
        reason,
        notes: notes.trim() || undefined,
      },
      selectedItem,
      (newStock) => {
        onWithdrawalComplete(selectedItemId, newStock);
      }
    );

    if (result.success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSelectedItemId('');
    setQuantity('');
    setReason('sale');
    setNotes('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Update preselected item when modal opens
  useMemo(() => {
    if (open && preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    }
  }, [open, preselectedItemId]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5" />
            {t('withdrawal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('withdrawal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label>{t('withdrawal.product')}</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedItem ? (
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {selectedItem.name}
                      <Badge variant="secondary" className="ml-2">
                        {selectedItem.current_stock} {selectedItem.unit}
                      </Badge>
                    </span>
                  ) : (
                    t('withdrawal.select_product')
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('withdrawal.search_product')} />
                  <CommandList>
                    <CommandEmpty>{t('withdrawal.no_products')}</CommandEmpty>
                    <CommandGroup>
                      {items.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => {
                            setSelectedItemId(item.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedItemId === item.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-1 items-center justify-between">
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className="ml-2 text-muted-foreground text-sm">
                                ({getCategoryName(item.category_id)})
                              </span>
                            </div>
                            <Badge 
                              variant={item.current_stock <= item.min_stock ? "destructive" : "secondary"}
                            >
                              {item.current_stock} {item.unit}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">{t('withdrawal.quantity')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={cn(
                  wouldBeNegative && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {selectedItem && (
                <span className="text-muted-foreground whitespace-nowrap">
                  {selectedItem.unit}
                </span>
              )}
            </div>
            {selectedItem && (
              <p className="text-sm text-muted-foreground">
                {t('withdrawal.available')}: {selectedItem.current_stock} {selectedItem.unit}
              </p>
            )}
            {wouldBeNegative && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {t('withdrawal.insufficient_stock')}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t('withdrawal.reason_label')}</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as WithdrawalReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">{t('withdrawal.reason.sale')}</SelectItem>
                <SelectItem value="waste">{t('withdrawal.reason.waste')}</SelectItem>
                <SelectItem value="internal_use">{t('withdrawal.reason.internal_use')}</SelectItem>
                <SelectItem value="expired">{t('withdrawal.reason.expired')}</SelectItem>
                <SelectItem value="other">{t('withdrawal.reason.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('withdrawal.notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('withdrawal.notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Low Stock Warning */}
          {wouldBeLowStock && !wouldBeNegative && quantityNum > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-warning-light p-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning-foreground">
                  {t('withdrawal.low_stock_warning')}
                </p>
                <p className="text-warning-foreground/80">
                  {t('withdrawal.remaining_after')}: {(selectedItem!.current_stock - quantityNum).toFixed(1)} {selectedItem!.unit}
                </p>
              </div>
            </div>
          )}

          {/* Responsible */}
          <div className="space-y-2">
            <Label>{t('withdrawal.responsible')}</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedItem || !isQuantityValid || isProcessing}
          >
            {isProcessing ? t('withdrawal.processing') : t('withdrawal.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
