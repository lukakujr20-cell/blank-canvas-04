import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatQuantity, formatQuantityChange } from '@/lib/formatNumber';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuditDetailModal from '@/components/AuditDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Search, FileText, ArrowDownCircle, ArrowUpCircle, RefreshCw, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StockHistoryEntry {
  id: string;
  item_id: string;
  previous_stock: number | null;
  new_stock: number;
  previous_expiry: string | null;
  new_expiry: string | null;
  changed_by: string;
  movement_type: string;
  reason: string | null;
  created_at: string;
  order_id?: string | null;
  order_item_id?: string | null;
  item_name?: string;
  user_email?: string;
}

interface Item {
  id: string;
  name: string;
}

export default function AuditHistory() {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [items, setItems] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<StockHistoryEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const getLocale = () => {
    switch (language) {
      case 'pt-BR': return ptBR;
      case 'es': return es;
      default: return enUS;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch items for name mapping
      const { data: itemsData } = await supabase
        .from('items')
        .select('id, name');

      const itemsMap = new Map<string, string>();
      itemsData?.forEach((item: Item) => {
        itemsMap.set(item.id, item.name);
      });
      setItems(itemsMap);

      // Fetch stock history with profiles for user emails
      const { data: historyData, error } = await supabase
        .from('stock_history')
        .select(`
          id,
          item_id,
          previous_stock,
          new_stock,
          previous_expiry,
          new_expiry,
          changed_by,
          movement_type,
          reason,
          created_at,
          order_id,
          order_item_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs from history
      const userIds = [...new Set(historyData?.map(h => h.changed_by) || [])];
      
      // Fetch profiles for user emails - prioritize email, fallback to full_name
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Map user_id to email (or full_name as fallback) for display in the audit table
      const profilesMap = new Map<string, string>();
      profilesData?.forEach(p => {
        // Prefer email, fallback to full_name
        profilesMap.set(p.user_id, p.email || p.full_name);
      });

      // Enrich history with user emails and product names
      const enrichedHistory = historyData?.map(h => ({
        ...h,
        item_name: itemsMap.get(h.item_id) || t('audit.unknown_product'),
        // Display email from profiles table (with fallback to full_name)
        user_email: profilesMap.get(h.changed_by) || t('audit.unknown_user'),
      })) || [];

      setHistory(enrichedHistory);
    } catch (error) {
      console.error('Error fetching audit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return <ArrowDownCircle className="h-4 w-4 text-destructive" />;
      case 'entry':
        return <ArrowUpCircle className="h-4 w-4 text-success" />;
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return <Badge variant="destructive">{t('audit.type_withdrawal')}</Badge>;
      case 'entry':
        return <Badge className="bg-success text-success-foreground">{t('audit.type_entry')}</Badge>;
      default:
        return <Badge variant="secondary">{t('audit.type_adjustment')}</Badge>;
    }
  };

  const calculateQuantityChange = (entry: StockHistoryEntry) => {
    const prev = entry.previous_stock ?? 0;
    const diff = entry.new_stock - prev;
    return formatQuantityChange(diff);
  };

  const filteredHistory = history.filter((entry) => {
    const matchesSearch = 
      entry.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = movementFilter === 'all' || entry.movement_type === movementFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('audit.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('audit.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('audit.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={movementFilter} onValueChange={setMovementFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('audit.all_movements')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('audit.all_movements')}</SelectItem>
                    <SelectItem value="withdrawal">{t('audit.type_withdrawal')}</SelectItem>
                    <SelectItem value="entry">{t('audit.type_entry')}</SelectItem>
                    <SelectItem value="adjustment">{t('audit.type_adjustment')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">{t('audit.no_records')}</h3>
              <p className="mt-2 text-center text-muted-foreground">
                {t('audit.no_records_desc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {filteredHistory.length} {t('audit.records_label')}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-header">
                    <TableHead className="font-semibold">{t('audit.col_datetime')}</TableHead>
                    <TableHead className="font-semibold">{t('audit.col_user')}</TableHead>
                    <TableHead className="font-semibold">{t('audit.col_product')}</TableHead>
                    <TableHead className="font-semibold">{t('audit.col_type')}</TableHead>
                    <TableHead className="font-semibold">{t('audit.col_quantity')}</TableHead>
                    <TableHead className="font-semibold">{t('audit.col_balance')}</TableHead>
                    <TableHead className="font-semibold">{t('audit.col_reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((entry, index) => {
                    const isPositiveMovement = entry.movement_type === 'entry';
                    const isNegativeMovement = entry.movement_type === 'withdrawal' || 
                      (entry.movement_type === 'adjustment' && (entry.new_stock < (entry.previous_stock ?? 0)));
                    
                    return (
                      <TableRow 
                        key={entry.id}
                        className={cn(
                          index % 2 === 1 ? 'bg-table-row-alt' : '',
                          isPositiveMovement && 'border-l-4 border-l-success',
                          isNegativeMovement && 'border-l-4 border-l-destructive',
                          'cursor-pointer hover:bg-muted/50'
                        )}
                        onClick={() => {
                          setSelectedEntry(entry);
                          setDetailModalOpen(true);
                        }}
                      >
                        <TableCell className="whitespace-nowrap">
                          {format(parseISO(entry.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: getLocale() })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.user_email}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {entry.item_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(entry.movement_type)}
                            {getMovementBadge(entry.movement_type)}
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          'font-bold',
                          isPositiveMovement && 'text-success',
                          isNegativeMovement && 'text-destructive'
                        )}>
                          {calculateQuantityChange(entry)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatQuantity(entry.new_stock)}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{entry.reason || '-'}</span>
                            <Eye className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Detail Modal */}
        <AuditDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          entry={selectedEntry}
        />
      </div>
    </DashboardLayout>
  );
}
