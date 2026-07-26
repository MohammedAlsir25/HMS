import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useImagingProcedureTypes, useUpdateImagingProcedureTypePrice } from '../../hooks/queries/useAdmin';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { notifySuccess, notifyError } from '../../utils/notify';
import { CURRENCY } from '../../utils/currency';

const SCAN_TYPE_LABELS = { A_SCAN: 'A-Scan', B_SCAN: 'B-Scan', OTT: 'OCT', BIOMETRY: 'Biometry/Pachymetry' };

export default function ImagingProcedureTypesPage() {
  const queryClient = useQueryClient();
  const { data: procedureTypes = [], isLoading, isError, error } = useImagingProcedureTypes();
  const updatePrice = useUpdateImagingProcedureTypePrice();
  const [seeding, setSeeding] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      await api.post('/admin/pricing/imaging-procedure-types/seed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pricing', 'imaging-procedure-types'] });
      notifySuccess('Default procedure types seeded');
    } catch (err) {
      notifyError(err);
    } finally {
      setSeeding(false);
    }
  }, [queryClient]);

  const handleToggleActive = useCallback(async (row) => {
    setTogglingId(row.id);
    try {
      await api.patch(`/admin/pricing/imaging-procedure-types/${row.id}`, { isActive: !row.isActive });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pricing', 'imaging-procedure-types'] });
      notifySuccess(row.isActive ? 'Deactivated' : 'Activated');
    } catch (err) {
      notifyError(err);
    } finally {
      setTogglingId(null);
    }
  }, [queryClient]);

  const columns = [
    { key: 'name', label: 'Procedure Name' },
    { key: 'nameAr', label: 'Arabic Name' },
    { key: 'scanType', label: 'Scan Type', render: (row) => <Badge variant="info">{SCAN_TYPE_LABELS[row.scanType] || row.scanType}</Badge> },
    { key: 'price', label: `Price (${CURRENCY})`, render: (row) => (
      <input
        type="number" step="0.01" min="0"
        defaultValue={row.price != null ? Number(row.price).toFixed(2) : ''}
        onBlur={(e) => {
          const val = e.target.value;
          updatePrice.mutate({ id: row.id, price: val ? parseFloat(val) : null });
        }}
        className="w-28 px-2 py-1 border border-silver rounded text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-lilac-bloom"
        placeholder="0.00"
      />
    )},
    { key: 'isActive', label: 'Status', render: (row) => (
      <button onClick={() => handleToggleActive(row)} disabled={togglingId === row.id}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-lilac-bloom rounded">
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {togglingId === row.id ? 'Updating...' : row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Imaging Procedure Types</h1>
          <p className="text-body text-slate mt-1">Manage imaging procedure catalog and pricing</p>
        </div>
        <Button onClick={handleSeed} loading={seeding} variant="secondary">Seed Defaults</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Procedure Types ({procedureTypes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-body text-slate text-center py-8">Loading...</p>
          ) : isError ? (
            <p className="text-body text-red-500 text-center py-8">Failed to load: {error?.message || 'Unknown error'}</p>
          ) : (
            <Table columns={columns} data={procedureTypes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
