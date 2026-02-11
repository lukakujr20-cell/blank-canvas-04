import { useSearchParams, useNavigate } from 'react-router-dom';
import POSInterface from '@/components/POSInterface';

export default function POS() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get('orderId') || '';
  const orderLabel = searchParams.get('orderLabel') || '';
  const tableId = searchParams.get('tableId') || null;
  const currentTotal = parseFloat(searchParams.get('currentTotal') || '0');

  const handleClose = () => {
    navigate('/dining-room');
  };

  if (!orderId) {
    navigate('/dining-room');
    return null;
  }

  return (
    <POSInterface
      onClose={handleClose}
      orderId={orderId}
      orderLabel={orderLabel}
      tableId={tableId}
      onOrderUpdated={() => {}}
      currentTotal={currentTotal}
    />
  );
}
