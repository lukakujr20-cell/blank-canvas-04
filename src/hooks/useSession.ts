import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface Session {
  id: string;
  restaurant_id: string;
  opened_by: string;
  closed_by: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  created_at: string;
}

export function useSession() {
  const { user, restaurantId } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentSession = useCallback(async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('restaurant_sessions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'open')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentSession(data as Session | null);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchCurrentSession();
  }, [fetchCurrentSession]);

  const openSession = async () => {
    if (!restaurantId || !user) return null;

    // Check if there's already an open session
    if (currentSession) {
      toast({
        title: t('session.already_open'),
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('restaurant_sessions')
        .insert({
          restaurant_id: restaurantId,
          opened_by: user.id,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      const session = data as Session;
      setCurrentSession(session);
      toast({ title: t('session.open_success') });
      return session;
    } catch (error) {
      console.error('Error opening session:', error);
      toast({
        title: t('session.error_open'),
        variant: 'destructive',
      });
      return null;
    }
  };

  const closeSession = async () => {
    if (!currentSession || !user) return false;

    try {
      const { error } = await supabase
        .from('restaurant_sessions')
        .update({
          status: 'closed',
          end_time: new Date().toISOString(),
          closed_by: user.id,
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(null);
      toast({ title: t('session.close_success') });
      return true;
    } catch (error) {
      console.error('Error closing session:', error);
      toast({
        title: t('session.error_close'),
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    currentSession,
    loading,
    openSession,
    closeSession,
    refreshSession: fetchCurrentSession,
  };
}
