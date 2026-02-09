import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export type WithdrawalReason = 'sale' | 'waste' | 'internal_use' | 'expired' | 'other';

interface WithdrawalData {
  itemId: string;
  quantity: number;
  reason: WithdrawalReason;
  notes?: string;
}

interface Item {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}

export function useStockWithdrawal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);

  const processWithdrawal = useCallback(async (
    data: WithdrawalData,
    currentItem: Item,
    onSuccess?: (newStock: number) => void
  ) => {
    if (!user?.id) {
      toast({
        title: t('common.error'),
        description: t('withdrawal.not_authenticated'),
        variant: 'destructive',
      });
      return { success: false };
    }

    // Validate quantity
    if (data.quantity <= 0) {
      toast({
        title: t('common.error'),
        description: t('withdrawal.invalid_quantity'),
        variant: 'destructive',
      });
      return { success: false };
    }

    // Check if withdrawal would result in negative stock
    if (data.quantity > currentItem.current_stock) {
      toast({
        title: t('common.error'),
        description: t('withdrawal.insufficient_stock'),
        variant: 'destructive',
      });
      return { success: false };
    }

    setIsProcessing(true);
    const newStock = currentItem.current_stock - data.quantity;
    const reasonText = data.notes 
      ? `${t(`withdrawal.reason.${data.reason}`)}: ${data.notes}`
      : t(`withdrawal.reason.${data.reason}`);

    try {
      // First, update the item stock
      const { error: updateError } = await supabase
        .from('items')
        .update({
          current_stock: newStock,
          last_count_date: new Date().toISOString().split('T')[0],
          last_counted_by: user.id,
        })
        .eq('id', data.itemId);

      if (updateError) {
        throw updateError;
      }

      // Then, insert into stock_history for audit
      const { error: historyError } = await supabase
        .from('stock_history')
        .insert({
          item_id: data.itemId,
          previous_stock: currentItem.current_stock,
          new_stock: newStock,
          changed_by: user.id,
          movement_type: 'withdrawal',
          reason: reasonText,
        });

      if (historyError) {
        // Try to rollback the stock update
        await supabase
          .from('items')
          .update({ current_stock: currentItem.current_stock })
          .eq('id', data.itemId);
        throw historyError;
      }

      // Check if stock is now below minimum
      const isLowStock = newStock <= currentItem.min_stock;

      const successMessage = isLowStock 
        ? `${t('withdrawal.success_low_stock')} ${currentItem.name}: -${data.quantity} ${currentItem.unit}`
        : `${currentItem.name}: -${data.quantity} ${currentItem.unit}`;

      toast({
        title: t('withdrawal.success'),
        description: successMessage,
        variant: isLowStock ? 'destructive' : 'default',
      });

      onSuccess?.(newStock);
      return { success: true, newStock, isLowStock };

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: t('common.error'),
        description: t('withdrawal.error'),
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  }, [user, toast, t]);

  return {
    processWithdrawal,
    isProcessing,
  };
}
