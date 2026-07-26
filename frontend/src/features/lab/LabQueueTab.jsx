import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLabOrders, useClaimOrder, useUnclaimOrder, useUpdateOrderStatus, labKeys } from '../../hooks/queries/useLab';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { notifySuccess, notifyError } from '../../utils/notify';
import LabResultEntryModal from './LabResultEntryModal';

const statusBadge = {
  SUBMITTED: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const priorityBadge = {
  ROUTINE: 'default',
  URGENT: 'danger',
  STAT: 'danger',
};

export default function LabQueueTab() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const orderParams = statusFilter !== 'ALL' ? `status=${statusFilter}` : '';
  const { data: orders = [], isLoading, error } = useLabOrders(orderParams);
  const claimOrder = useClaimOrder();
  const unclaimOrder = useUnclaimOrder();
  const updateOrderStatus = useUpdateOrderStatus();

  const handleClaim = useCallback((orderId) => {
    claimOrder.mutate(orderId, {
      onSuccess: () => notifySuccess('Order claimed'),
      onError: (err) => notifyError(err),
    });
  }, [claimOrder]);

  const handleUnclaim = useCallback((orderId) => {
    unclaimOrder.mutate(orderId, {
      onSuccess: () => notifySuccess('Order unclaimed'),
      onError: (err) => notifyError(err),
    });
  }, [unclaimOrder]);

  const handleComplete = useCallback((orderId) => {
    updateOrderStatus.mutate({ id: orderId, status: 'COMPLETED' }, {
      onSuccess: () => notifySuccess('Order completed'),
      onError: (err) => notifyError(err),
    });
  }, [updateOrderStatus]);

  const handleCancel = useCallback((orderId) => {
    updateOrderStatus.mutate({ id: orderId, status: 'CANCELLED' }, {
      onSuccess: () => notifySuccess('Order cancelled'),
      onError: (err) => notifyError(err),
    });
  }, [updateOrderStatus]);

  const handleViewDetail = useCallback((order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  }, []);

  const handleSaveResults = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: labKeys.orders(orderParams) });
    queryClient.invalidateQueries({ queryKey: labKeys.stats });
  }, [queryClient, orderParams]);

  const filterOptions = ['ALL', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-8 text-center">
        <p className="text-sm text-red-700 dark:text-red-300">{t('common.error')}: {error.message || 'Failed to load orders'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f}
            className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-colors touch-target
              ${statusFilter === f ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
            onClick={() => setStatusFilter(f)}
          >
            {f === 'ALL' ? t('lab.filterAll') : t('lab.filter' + f.charAt(0) + f.slice(1).toLowerCase())}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body text-slate">{t('lab.noOrders')}</p>
        </div>
      ) : (
        <Table
          columns={[
            { key: 'status', label: t('lab.status'), render: (r) => (
              <Badge variant={statusBadge[r.status]}>{t('lab.' + r.status.toLowerCase())}</Badge>
            )},
            { key: 'patient', label: t('lab.patient'), render: (r) => r.patient?.fullName || '-' },
            { key: 'requestedBy', label: t('lab.requestedBy'), render: (r) => r.requestedBy?.fullName || '-' },
            { key: 'priority', label: t('lab.priority'), render: (r) => (
              <Badge variant={priorityBadge[r.priority]}>{r.priority}</Badge>
            )},
            { key: 'tests', label: t('lab.testsCount'), render: (r) => r.tests?.length || 0 },
            { key: 'date', label: t('lab.date'), render: (r) => new Date(r.createdAt).toLocaleDateString() },
            { key: 'actions', label: t('lab.actions'), render: (r) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); handleViewDetail(r); }} className="text-lilac-bloom hover:underline text-caption px-1">
                  {t(r.status === 'COMPLETED' ? 'lab.viewReport' : 'lab.enterResults')}
                </button>
                {r.status === 'SUBMITTED' && (
                  <button onClick={(e) => { e.stopPropagation(); handleClaim(r.id); }} className="text-green-600 dark:text-green-400 hover:underline text-caption px-1">
                    {t('lab.claim')}
                  </button>
                )}
                {r.status === 'IN_PROGRESS' && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); handleComplete(r.id); }} className="text-green-600 dark:text-green-400 hover:underline text-caption px-1">
                      {t('lab.markCompleted')}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleUnclaim(r.id); }} className="text-slate hover:underline text-caption px-1">
                      {t('lab.unclaim')}
                    </button>
                  </>
                )}
                {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                  <button onClick={(e) => { e.stopPropagation(); handleCancel(r.id); }} className="text-red-500 dark:text-red-400 hover:underline text-caption px-1">
                    {t('lab.cancelOrder')}
                  </button>
                )}
              </div>
            )},
          ]}
          data={orders}
          onRowClick={handleViewDetail}
        />
      )}

      {showDetail && selectedOrder && (
        <LabResultEntryModal
          order={selectedOrder}
          open={showDetail}
          onClose={() => { setShowDetail(false); setSelectedOrder(null); }}
          onSave={handleSaveResults}
        />
      )}
    </div>
  );
}
