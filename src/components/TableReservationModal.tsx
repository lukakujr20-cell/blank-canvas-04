import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Users, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TableReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  onReserved: () => void;
}

export function TableReservationModal({
  open,
  onOpenChange,
  tableId,
  tableNumber,
  restaurantId,
  onReserved,
}: TableReservationModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('20:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast({ title: t('reservation.name_required'), variant: 'destructive' });
      return;
    }
    if (!date) {
      toast({ title: t('reservation.date_required'), variant: 'destructive' });
      return;
    }
    if (!user) return;

    // Combine date + time into a proper datetime
    const [hours, minutes] = time.split(':').map(Number);
    const reservedAt = new Date(date);
    reservedAt.setHours(hours, minutes, 0, 0);

    setLoading(true);
    try {
      // Insert reservation
      const { error: resError } = await supabase
        .from('table_reservations' as any)
        .insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          customer_name: customerName.trim(),
          reserved_at: reservedAt.toISOString(),
          party_size: partySize,
          notes: notes.trim() || null,
          created_by: user.id,
          status: 'active',
        });

      if (resError) throw resError;

      // Mark table as reserved
      const { error: tableError } = await supabase
        .from('restaurant_tables')
        .update({ status: 'reserved' })
        .eq('id', tableId);

      if (tableError) throw tableError;

      toast({ title: t('reservation.success') });
      onReserved();
      handleClose();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCustomerName('');
    setPartySize(2);
    setDate(undefined);
    setTime('20:00');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {t('reservation.title')} — {t('dining.table')} {tableNumber}
          </DialogTitle>
          <DialogDescription>{t('reservation.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {t('reservation.customer_name')}
            </Label>
            <Input
              placeholder={t('reservation.customer_name_placeholder')}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {t('reservation.date')}
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd/MM/yyyy') : t('reservation.pick_date')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setCalendarOpen(false);
                  }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t('reservation.time')}
            </Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Party Size */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t('reservation.party_size')}
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
              >
                −
              </Button>
              <Input
                type="number"
                value={partySize}
                onChange={(e) => setPartySize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
                min={1}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPartySize(partySize + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('reservation.notes')}</Label>
            <Input
              placeholder={t('reservation.notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {loading ? t('common.saving') : t('reservation.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
