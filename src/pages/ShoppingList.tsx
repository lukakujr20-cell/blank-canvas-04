import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Copy, MessageCircle, Printer, ShoppingCart, ArrowLeft, Pencil, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Supplier {
  id: string;
  name: string;
  whatsapp: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  expiry_date: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isBelowMin: boolean;
  suggestedQty: number;
  supplier_id: string | null;
}

export default function ShoppingList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, suppliersRes] = await Promise.all([
          supabase.from('items').select('*').is('deleted_at', null),
          supabase.from('suppliers').select('*').order('name'),
        ]);

        if (itemsRes.error) throw itemsRes.error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const problemItems: ShoppingItem[] = [];
        const initialQuantities: Record<string, number> = {};

        itemsRes.data?.forEach((item) => {
          let isExpired = false;
          let isExpiringSoon = false;
          
          if (item.expiry_date) {
            const expiryDate = new Date(item.expiry_date);
            expiryDate.setHours(0, 0, 0, 0);
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
              isExpired = true;
            } else if (diffDays >= 0 && diffDays <= 3) {
              isExpiringSoon = true;
            }
          }
          
          const isBelowMin = (item.current_stock || 0) < (item.min_stock || 0);

          if (isExpired || isExpiringSoon || isBelowMin) {
            let suggestedQty = 0;
            
            if (isExpired) {
              suggestedQty = item.min_stock || 0;
            } else if (isExpiringSoon && isBelowMin) {
              suggestedQty = item.min_stock || 0;
            } else if (isExpiringSoon) {
              suggestedQty = item.min_stock || 0;
            } else if (isBelowMin) {
              suggestedQty = (item.min_stock || 0) - (item.current_stock || 0);
            }

            const finalQty = Math.max(0, suggestedQty);
            
            problemItems.push({
              id: item.id,
              name: item.name,
              unit: item.unit,
              current_stock: item.current_stock || 0,
              min_stock: item.min_stock || 0,
              expiry_date: item.expiry_date,
              isExpired,
              isExpiringSoon,
              isBelowMin,
              suggestedQty: finalQty,
              supplier_id: item.supplier_id,
            });

            initialQuantities[item.id] = finalQty;
          }
        });

        problemItems.sort((a, b) => {
          if (a.isExpired && !b.isExpired) return -1;
          if (!a.isExpired && b.isExpired) return 1;
          if (a.isExpiringSoon && !b.isExpiringSoon) return -1;
          if (!a.isExpiringSoon && b.isExpiringSoon) return 1;
          return a.name.localeCompare(b.name);
        });

        setItems(problemItems);
        setSuppliers(suppliersRes.data || []);
        setEditedQuantities(initialQuantities);
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value, 10);
    setEditedQuantities(prev => ({
      ...prev,
      [itemId]: isNaN(numValue) || numValue < 0 ? 0 : numValue
    }));
  };

  const getItemQuantity = (itemId: string) => {
    return editedQuantities[itemId] ?? 0;
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return t('shopping.no_supplier');
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || t('shopping.no_supplier');
  };

  const getSupplierWhatsApp = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.whatsapp || '';
  };

  // Group items by supplier
  const getItemsBySupplier = () => {
    const grouped: Record<string, ShoppingItem[]> = {};
    
    items.forEach(item => {
      const key = item.supplier_id || 'no_supplier';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  };

  const getFormattedListForSupplier = (supplierItems: ShoppingItem[]) => {
    const dateStr = format(new Date(), 'dd/MM/yyyy');
    let text = `*${t('shopping.title').toUpperCase()} - ${dateStr}*\n`;

    const belowMinItems = supplierItems.filter(item => item.isBelowMin && !item.isExpired && !item.isExpiringSoon);
    const expiringSoonItems = supplierItems.filter(item => item.isExpiringSoon);
    const expiredItems = supplierItems.filter(item => item.isExpired);

    if (belowMinItems.length > 0) {
      text += `-----------${t('shopping.tag_below_min')}---------------\n`;
      belowMinItems.forEach((item) => {
        const qty = getItemQuantity(item.id);
        text += `${item.name} - ${qty} ${item.unit}\n`;
      });
    }

    if (expiringSoonItems.length > 0) {
      text += `-----------${t('shopping.tag_expiring_soon')}---------------\n`;
      expiringSoonItems.forEach((item) => {
        const qty = getItemQuantity(item.id);
        text += `${item.name} - ${qty} ${item.unit}\n`;
      });
    }

    if (expiredItems.length > 0) {
      text += `-------------${t('shopping.tag_expired')}-------------\n`;
      expiredItems.forEach((item) => {
        const qty = getItemQuantity(item.id);
        text += `${item.name} - ${qty} ${item.unit}\n`;
      });
    }

    return text;
  };

  const getFormattedList = () => {
    return getFormattedListForSupplier(items);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFormattedList());
      toast({
        title: t('shopping.copied'),
        description: t('shopping.copied_desc'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('shopping.copy_error'),
        variant: 'destructive',
      });
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(getFormattedList());
    const url = `https://api.whatsapp.com/send?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppSupplier = (supplierId: string, supplierItems: ShoppingItem[]) => {
    const whatsapp = getSupplierWhatsApp(supplierId);
    const phoneDigits = whatsapp.replace(/\D/g, '');
    const message = encodeURIComponent(getFormattedListForSupplier(supplierItems));
    const url = `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = format(new Date(), 'dd/MM/yyyy');

    // Group items by category
    const belowMinItems = items.filter(item => item.isBelowMin && !item.isExpired && !item.isExpiringSoon);
    const expiringSoonItems = items.filter(item => item.isExpiringSoon);
    const expiredItems = items.filter(item => item.isExpired);

    const generateTableRows = (itemList: ShoppingItem[]) => {
      return itemList.map(item => {
        const qty = getItemQuantity(item.id);
        return `
          <tr>
            <td>${item.name}</td>
            <td>${getSupplierName(item.supplier_id)}</td>
            <td><strong>${qty} ${item.unit}</strong></td>
          </tr>
        `;
      }).join('');
    };

    const generateSection = (title: string, itemList: ShoppingItem[], tagClass: string) => {
      if (itemList.length === 0) return '';
      return `
        <div class="section">
          <h2><span class="tag ${tagClass}">${title}</span></h2>
          <table>
            <thead>
              <tr>
                <th>${t('table.product')}</th>
                <th>${t('shopping.supplier')}</th>
                <th>${t('shopping.quantity')}</th>
              </tr>
            </thead>
            <tbody>
              ${generateTableRows(itemList)}
            </tbody>
          </table>
        </div>
      `;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('shopping.title')} - ${dateStr}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              font-size: 18px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .section {
              margin-bottom: 24px;
            }
            .section h2 {
              font-size: 14px;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .tag {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .tag-expired {
              background-color: #7c3aed;
              color: white;
            }
            .tag-expiring {
              background-color: #f97316;
              color: white;
            }
            .tag-below {
              background-color: #dc2626;
              color: white;
            }
            .empty-message {
              text-align: center;
              padding: 40px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${t('shopping.title').toUpperCase()} - ${dateStr}</h1>
          ${items.length === 0 
            ? `<div class="empty-message">${t('shopping.no_items_pending')}</div>`
            : `
              ${generateSection(t('shopping.tag_below_min'), belowMinItems, 'tag-below')}
              ${generateSection(t('shopping.tag_expiring_soon'), expiringSoonItems, 'tag-expiring')}
              ${generateSection(t('shopping.tag_expired'), expiredItems, 'tag-expired')}
            `
          }
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const itemsBySupplier = getItemsBySupplier();
  const supplierIds = Object.keys(itemsBySupplier);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
                <ShoppingCart className="h-7 w-7 text-primary" />
                {t('shopping.title')}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {t('shopping.subtitle')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={handleCopy}
              disabled={items.length === 0}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t('shopping.copy')}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleWhatsApp}
              disabled={items.length === 0}
              className="text-success border-success hover:bg-success/10 hover:text-success"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {t('shopping.whatsapp')}
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint}
              disabled={items.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              {t('shopping.print')}
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-expired text-expired-foreground">{t('shopping.tag_expired')}</Badge>
            <span className="text-sm text-muted-foreground">{t('shopping.expired_desc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-expiring text-expiring-foreground">{t('shopping.tag_expiring_soon')}</Badge>
            <span className="text-sm text-muted-foreground">{t('shopping.expiring_soon_desc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{t('shopping.tag_below_min')}</Badge>
            <span className="text-sm text-muted-foreground">{t('shopping.below_min_desc')}</span>
          </div>
        </div>

        {/* Items List Grouped by Supplier */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-success mb-4" />
              <h3 className="text-lg font-medium">{t('shopping.all_good')}</h3>
              <p className="text-muted-foreground mt-1">{t('shopping.no_items_desc')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {supplierIds.map((supplierId) => {
              const supplierItems = itemsBySupplier[supplierId];
              const supplierName = supplierId === 'no_supplier' 
                ? t('shopping.no_supplier') 
                : getSupplierName(supplierId);
              const hasValidSupplier = supplierId !== 'no_supplier';

              return (
                <Card key={supplierId}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Truck className="h-5 w-5 text-primary" />
                        {supplierName}
                        <Badge variant="secondary">{supplierItems.length} {supplierItems.length === 1 ? 'item' : 'itens'}</Badge>
                      </CardTitle>
                      {hasValidSupplier && (
                        <Button
                          size="sm"
                          onClick={() => handleWhatsAppSupplier(supplierId, supplierItems)}
                          className="bg-success hover:bg-success/90 text-success-foreground"
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          {t('shopping.send_order')}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {supplierItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium">{item.name}</h3>
                              {item.isExpired && (
                                <Badge className="bg-expired text-expired-foreground">
                                  {t('shopping.tag_expired')}
                                </Badge>
                              )}
                              {item.isExpiringSoon && (
                                <Badge className="bg-expiring text-expiring-foreground">
                                  {t('shopping.tag_expiring_soon')}
                                </Badge>
                              )}
                              {item.isBelowMin && (
                                <Badge variant="destructive">
                                  {t('shopping.tag_below_min')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t('shopping.current')}: {item.current_stock} {item.unit} | 
                              {t('shopping.minimum')}: {item.min_stock} {item.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg border-2 border-dashed border-primary/30">
                            <Pencil className="h-4 w-4 text-primary" />
                            <span className="text-sm text-muted-foreground">{t('shopping.quantity')}:</span>
                            <Input
                              type="number"
                              min="0"
                              value={getItemQuantity(item.id)}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-20 h-8 text-center font-bold text-primary border-primary/50 focus:border-primary"
                            />
                            <span className="text-sm font-medium">{item.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
