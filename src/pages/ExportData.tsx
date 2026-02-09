import { useState } from 'react';
import { Download, Database, Users, HardDrive, Zap, Key, ScrollText, Calendar, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

interface ExportCategory {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  tables?: string[];
  edgeFunction?: string;
}

const exportCategories: ExportCategory[] = [
  {
    id: 'database',
    titleKey: 'export.database',
    descriptionKey: 'export.database_desc',
    icon: Database,
    tables: ['exercises', 'profiles', 'students', 'workout_items', 'workouts'],
  },
  {
    id: 'users',
    titleKey: 'export.users',
    descriptionKey: 'export.users_desc',
    icon: Users,
    edgeFunction: 'export-data',
  },
  {
    id: 'storage',
    titleKey: 'export.storage',
    descriptionKey: 'export.storage_desc',
    icon: HardDrive,
    edgeFunction: 'export-data',
  },
  {
    id: 'edge_functions',
    titleKey: 'export.edge_functions',
    descriptionKey: 'export.edge_functions_desc',
    icon: Zap,
    edgeFunction: 'export-data',
  },
  {
    id: 'secrets',
    titleKey: 'export.secrets',
    descriptionKey: 'export.secrets_desc',
    icon: Key,
    edgeFunction: 'export-data',
  },
  {
    id: 'logs',
    titleKey: 'export.logs',
    descriptionKey: 'export.logs_desc',
    icon: ScrollText,
    edgeFunction: 'export-data',
  },
  {
    id: 'appointments',
    titleKey: 'export.appointments',
    descriptionKey: 'export.appointments_desc',
    icon: Calendar,
    edgeFunction: 'export-data',
  },
];

function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        const stringValue = value === null || value === undefined ? '' : String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ),
  ];
  return csvRows.join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportData() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, ExportStatus>>({});

  const setStatus = (id: string, status: ExportStatus) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const exportDatabaseTable = async (tableName: string) => {
    // Use type assertion since table names are dynamic
    const { data, error } = await (supabase.from(tableName as any).select('*') as any);
    if (error) throw error;
    return data || [];
  };

  const exportAllDatabaseTables = async () => {
    const categoryId = 'database';
    setStatus(categoryId, 'loading');
    try {
      const tables = ['exercises', 'profiles', 'students', 'workout_items', 'workouts'];
      let totalRows = 0;

      for (const table of tables) {
        const data = await exportDatabaseTable(table);
        if (data.length > 0) {
          const csv = convertToCSV(data);
          downloadCSV(csv, table);
          totalRows += data.length;
        }
      }

      setStatus(categoryId, 'success');
      toast({
        title: t('export.success'),
        description: `${totalRows} ${t('export.rows_exported')}`,
      });
      setTimeout(() => setStatus(categoryId, 'idle'), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setStatus(categoryId, 'error');
      toast({
        title: t('export.error'),
        description: String(error),
        variant: 'destructive',
      });
      setTimeout(() => setStatus(categoryId, 'idle'), 3000);
    }
  };

  const exportViaEdgeFunction = async (categoryId: string) => {
    setStatus(categoryId, 'loading');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `https://varlljbeopdbbpzuavaj.supabase.co/functions/v1/export-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ category: categoryId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const result = await response.json();

      if (result.data && result.data.length > 0) {
        const csv = convertToCSV(result.data);
        downloadCSV(csv, `${categoryId}_export`);
      } else if (result.info) {
        // For categories that return info instead of data
        const csv = convertToCSV([result.info]);
        downloadCSV(csv, `${categoryId}_export`);
      }

      setStatus(categoryId, 'success');
      toast({
        title: t('export.success'),
        description: result.message || t('export.exported_successfully'),
      });
      setTimeout(() => setStatus(categoryId, 'idle'), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setStatus(categoryId, 'error');
      toast({
        title: t('export.error'),
        description: String(error),
        variant: 'destructive',
      });
      setTimeout(() => setStatus(categoryId, 'idle'), 3000);
    }
  };

  const handleExport = (category: ExportCategory) => {
    if (category.id === 'database') {
      exportAllDatabaseTables();
    } else {
      exportViaEdgeFunction(category.id);
    }
  };

  const handleExportAll = async () => {
    for (const category of exportCategories) {
      await handleExport(category);
    }
  };

  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('export.title')}</h1>
            <p className="text-muted-foreground">{t('export.subtitle')}</p>
          </div>
          <Button onClick={handleExportAll} className="gap-2">
            <Download className="h-4 w-4" />
            {t('export.export_all')}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exportCategories.map((category) => {
            const status = statuses[category.id] || 'idle';
            const Icon = category.icon;

            return (
              <Card key={category.id} className="relative overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t(category.titleKey)}</CardTitle>
                      </div>
                    </div>
                    {category.tables && (
                      <Badge variant="secondary" className="text-xs">
                        {category.tables.length} {t('export.tables')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {t(category.descriptionKey)}
                  </CardDescription>
                  {category.tables && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {category.tables.map((table) => (
                        <Badge key={table} variant="outline" className="text-xs font-mono">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleExport(category)}
                    disabled={status === 'loading'}
                  >
                    {getStatusIcon(status)}
                    {status === 'loading'
                      ? t('export.exporting')
                      : t('export.export_csv')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
