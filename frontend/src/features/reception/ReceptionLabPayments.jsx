import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { notifySuccess, notifyError } from '../../utils/notify';

export default function ReceptionLabPayments() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedForPayment, setSelectedForPayment] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const { data: pendingOrders = [], isLoading } = useQuery({
    queryKey: ['lab', 'orders', 'pendingPayment'],
    queryFn: () => api.get('/lab/orders?pendingPayment=true'),
  });

  const payMutation = useMutation({
    mutationFn: (data) => api.post('/reception/lab/pay', data),
    onSuccess: (result) => {
      notifySuccess(`Payment collected: ${result.totalAmount.toFixed(2)} for ${result.orderCount} orders`);
      setSelectedForPayment([]);
      queryClient.invalidateQueries({ queryKey: ['lab', 'orders'] });
    },
    onError: (err) => notifyError(err),
  });

  const toggleOrder = (orderId) => {
    setSelectedForPayment((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handlePay = () => {
    if (selectedForPayment.length === 0) return;
    payMutation.mutate({ orderIds: selectedForPayment, paymentMethod });
  };

  const totalAmount = pendingOrders
    .filter((o) => selectedForPayment.includes(o.id))
    .reduce((sum, o) => sum + (o.tests || []).reduce((s, t) => s + Number(t.test?.price || 0), 0), 0);

  if (isLoading) {
    return <p className="text-body text-slate text-center py-8">Loading lab orders...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-subheading font-semibold text-obsidian">Lab Payments</h2>
          <p className="text-caption text-slate">Collect payment for pending lab orders</p>
        </div>
      </div>

      {pendingOrders.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-body text-slate text-center py-8">No pending lab orders</p>
          </CardContent>
        </Card>
      )}

      {pendingOrders.length > 0 && (
        <div className="space-y-3">
          {pendingOrders.map((order) => {
            const orderTotal = (order.tests || []).reduce((s, t) => s + Number(t.test?.price || 0), 0);
            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={selectedForPayment.includes(order.id)}
                          onChange={() => toggleOrder(order.id)}
                          className="accent-lilac-bloom"
                        />
                        <span className="font-medium text-obsidian">{order.patient?.fullName || 'Unknown'}</span>
                        <span className="text-caption text-slate">MRN: {order.patient?.mrn || '-'}</span>
                      </div>
                      <div className="ml-6 flex flex-wrap gap-1.5">
                        {(order.tests || []).map((ot) => (
                          <Badge key={ot.id} variant="default">{ot.test?.name || ot.testId}</Badge>
                        ))}
                      </div>
                      {order.clinicalNotes && (
                        <p className="ml-6 text-caption text-slate mt-1">{order.clinicalNotes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-obsidian">{orderTotal.toFixed(2)}</p>
                      <p className="text-caption text-slate">{order.tests?.length || 0} tests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedForPayment.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-body font-semibold text-obsidian">
                  {selectedForPayment.length} order(s) selected
                </p>
                <p className="text-heading-sm font-bold text-obsidian">{totalAmount.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
                <Button variant="primary" onClick={handlePay} loading={payMutation.isPending}>
                  Collect Payment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
