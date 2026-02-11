import { useState } from 'react';
import { ChevronDown, Leaf, Beef, Milk, Fish, Wine, Wheat, Apple, Coffee, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, parseISO, differenceInDays } from 'date-fns';

interface Item {
  id: string;
  category_id: string;
  name: string;
  unit: string;
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

interface CategoryAccordionProps {
  categoryName: string;
  items: Item[];
  editedItems: Map<string, EditedItem>;
  onStockChange: (itemId: string, value: string) => void;
  onExpiryChange: (itemId: string, date: Date | undefined) => void;
  getDisplayStock: (item: Item) => number;
  getDisplayExpiry: (item: Item) => string | null;
  defaultOpen?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  vegeta: Leaf,
  legume: Leaf,
  verdura: Leaf,
  salada: Leaf,
  proteín: Beef,
  proteina: Beef,
  carne: Beef,
  frango: Beef,
  lacticín: Milk,
  laticín: Milk,
  leite: Milk,
  queijo: Milk,
  peixe: Fish,
  marisco: Fish,
  bebida: Wine,
  vinho: Wine,
  cerveja: Wine,
  cereal: Wheat,
  grão: Wheat,
  farinha: Wheat,
  fruta: Apple,
  café: Coffee,
  coffee: Coffee,
};

function getCategoryIcon(categoryName: string): React.ElementType {
  const lower = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return Package;
}

export function CategoryAccordion({
  categoryName,
  items,
  editedItems,
  onStockChange,
  onExpiryChange,
  getDisplayStock,
  getDisplayExpiry,
  defaultOpen = true,
}: CategoryAccordionProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = getCategoryIcon(categoryName);

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

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold">{categoryName}</span>
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-table-header">
                <TableHead className="font-semibold">{t('table.product')}</TableHead>
                <TableHead className="font-semibold">{t('table.unit')}</TableHead>
                <TableHead className="font-semibold">{t('table.min_stock')}</TableHead>
                <TableHead className="font-semibold">{t('table.current_qty')}</TableHead>
                <TableHead className="font-semibold">{t('table.expiry')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    getRowClassName(item),
                    index % 2 === 1 && !getRowClassName(item) && 'bg-table-row-alt'
                  )}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.min_stock}</TableCell>
                  <TableCell className={cn('p-2', getStockCellClassName(item))}>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={getDisplayStock(item)}
                      onChange={(e) => onStockChange(item.id, e.target.value)}
                      className="h-9 w-24 bg-background"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-[140px] justify-start text-left font-normal',
                            !getDisplayExpiry(item) && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {getDisplayExpiry(item)
                            ? format(parseISO(getDisplayExpiry(item)!), 'dd/MM/yyyy')
                            : t('stock_entry.select_date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={getDisplayExpiry(item) ? parseISO(getDisplayExpiry(item)!) : undefined}
                          onSelect={(date) => onExpiryChange(item.id, date)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
