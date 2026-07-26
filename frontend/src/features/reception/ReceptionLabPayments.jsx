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

  const [collectingId, setCollectingId] = useState(null);

  const { data: pendingOrders = [], isLoading } = useQuery({
    queryKey: ['lab', 'orders', 'pendingPayment'],
    queryFn: () => api.get('/lab/orders?pendingPayment=true'),
  });

  const payMutation = useMutation({
    mutationFn: (data) => api.post('/reception/lab/pay', data),
    onSuccess: (result) => {
      notifySuccess(`Payment collected: ${result.totalAmount.toFixed(2)} for ${result.orderCount} orders`);
      setCollectingId(null);
      queryClient.invalidateQueries({ queryKey: ['lab', 'orders'] });
    },
    onError: (err) => {
      notifyError(err);
      setCollectingId(null);
    },
  });

  const handleCollect = (orderId) => {
    setCollectingId(orderId);
    payMutation.mutate({ orderIds: [orderId], paymentMethod: 'CASH' });
  };

  if (isLoading) {
    return <p className="text-body text-slate text-center py-8">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-subheading font-semibold text-obsidian">{t('reception.labPayments')}</h2>
          <p className="text-caption text-slate">{t('reception.labPaymentsDesc')}</p>
        </div>
      </div>

      {pendingOrders.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-body text-slate text-center py-8">{t('reception.noPendingLabOrders')}</p>
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
                        <span className="font-medium text-obsidian">{order.patient?.fullName || 'Unknown'}</span>
                        <span className="text-caption text-slate">MRN: {order.patient?.mrn || '-'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(order.tests || []).map((ot) => (
                          <Badge key={ot.id} variant="default">{ot.test?.name || ot.testId}</Badge>
                        ))}
                      </div>
                      {order.clinicalNotes && (
                        <p className="text-caption text-slate mt-1">{order.clinicalNotes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <p className="font-semibold text-obsidian">{orderTotal.toFixed(2)} AED</p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleCollect(order.id)}
                        loading={collectingId === order.id}
                      >
                        {t('reception.collect')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
