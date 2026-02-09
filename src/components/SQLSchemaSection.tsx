import { useState } from 'react';
import { Copy, Check, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const tableSchemas: { name: string; sql: string }[] = [
  {
    name: 'profiles',
    sql: `CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  instagram_handle TEXT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can crud their own data"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);`,
  },
  {
    name: 'exercises',
    sql: `CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  video_url TEXT,
  equipment TEXT,
  muscle_group TEXT
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage exercises"
  ON public.exercises FOR ALL
  USING ((auth.uid() = coach_id) OR (coach_id IS NULL));`,
  },
  {
    name: 'students',
    sql: `CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  goals TEXT,
  active BOOLEAN DEFAULT true,
  access_code TEXT
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their students"
  ON public.students FOR ALL
  USING (auth.uid() = coach_id);`,
  },
  {
    name: 'workouts',
    sql: `CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  student_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  description TEXT,
  CONSTRAINT workouts_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT workouts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage workouts"
  ON public.workouts FOR ALL
  USING (auth.uid() = coach_id);`,
  },
  {
    name: 'workout_items',
    sql: `CREATE TABLE public.workout_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  sets INTEGER,
  reps TEXT,
  weight TEXT,
  rest_time_seconds INTEGER,
  order_index INTEGER DEFAULT 0,
  notes TEXT,
  CONSTRAINT workout_items_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(id),
  CONSTRAINT workout_items_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id)
);

ALTER TABLE public.workout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage workout items (SELECT)"
  ON public.workout_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = workout_items.workout_id
    AND workouts.coach_id = auth.uid()
  ));

CREATE POLICY "Coaches can insert workout items"
  ON public.workout_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = workout_items.workout_id
    AND workouts.coach_id = auth.uid()
  ));`,
  },
];

export default function SQLSchemaSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [copiedTable, setCopiedTable] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const allSQL = tableSchemas.map((s) => `-- ========== ${s.name} ==========\n${s.sql}`).join('\n\n');

  const handleCopy = async (sql: string, tableName: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopiedTable(tableName);
      toast({
        title: t('export.sql_copied'),
        description: tableName === '__all__'
          ? t('export.sql_all_copied_desc')
          : `${tableName} SQL ${t('export.sql_copied_desc')}`,
      });
      setTimeout(() => setCopiedTable(null), 2000);
    } catch {
      toast({
        title: t('export.error'),
        description: t('export.sql_copy_error'),
        variant: 'destructive',
      });
    }
  };

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t('export.sql_schema')}</CardTitle>
              <CardDescription>{t('export.sql_schema_desc')}</CardDescription>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => handleCopy(allSQL, '__all__')}
          >
            {copiedTable === '__all__' ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedTable === '__all__' ? t('export.copied') : t('export.copy_all_sql')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tableSchemas.map((schema) => {
          const isExpanded = expandedTables[schema.name] ?? false;

          return (
            <div
              key={schema.name}
              className="rounded-lg border border-border bg-muted/30 overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleTable(schema.name)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-mono text-sm font-medium">{schema.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(schema.sql, schema.name);
                  }}
                >
                  {copiedTable === schema.name ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedTable === schema.name ? t('export.copied') : t('export.copy')}
                </Button>
              </div>
              {isExpanded && (
                <div className="border-t border-border px-4 py-3">
                  <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto">
                    {schema.sql}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
