import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useARAgingSummary, useARAging } from '../../hooks/queries/useAccounting';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';

export default function ARAgingDashboard() {
  const { t } = useTranslation();
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErr } = useARAgingSummary();
  const { data: agingData, isLoading: agingLoading, isError: agingError, error: agingErr } = useARAging('limit=100');

  const aging = agingData?.patients || agingData || [];
  const s = summary || {};

  const bucketCards = [
    { label: '0–30 Days', value: s.current30 || 0, color: 'text-green-600' },
    { label: '31–60 Days', value: s.current31to60 || 0, color: 'text-amber-600' },
    { label: '61–90 Days', value: s.current61to90 || 0, color: 'text-orange-600' },
    { label: '90+ Days', value: s.over90 || 0, color: 'text-red-600' },
  ];

  if (summaryLoading || agingLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.arAging', 'AR Aging')}</h1>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (summaryError || agingError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.arAging', 'AR Aging')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {summaryErr?.message || agingErr?.message || 'Failed to load AR aging data'}
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'patient', header: t('accounting.patient', 'Patient'),
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors font-medium" onClick={() => setSelectedPatient(row)}>
          {row.patient?.firstName || ''} {row.patient?.lastName || ''}
        </button>
      ),
    },
    {
      key: 'mrn', header: t('accounting.mrn', 'MRN'),
      render: (row) => row.patient?.mrn || '-',
    },
    {
      key: 'current30', header: '0–30d',
      render: (row) => row.current30 > 0 ? <span className="text-green-600">{formatCurrency(row.current30)}</span> : <span className="text-slate">-</span>,
    },
    {
      key: 'current31to60', header: '31–60d',
      render: (row) => row.current31to60 > 0 ? <span className="text-amber-600">{formatCurrency(row.current31to60)}</span> : <span className="text-slate">-</span>,
    },
    {
      key: 'current61to90', header: '61–90d',
      render: (row) => row.current61to90 > 0 ? <span className="text-orange-600">{formatCurrency(row.current61to90)}</span> : <span className="text-slate">-</span>,
    },
    {
      key: 'over90', header: '90+',
      render: (row) => row.over90 > 0 ? <span className="text-red-600 font-semibold">{formatCurrency(row.over90)}</span> : <span className="text-slate">-</span>,
    },
    {
      key: 'totalBalance', header: t('accounting.total', 'Total'),
      render: (row) => {
        const total = (row.current30 || 0) + (row.current31to60 || 0) + (row.current61to90 || 0) + (row.over90 || 0);
        return <span className="font-semibold">{formatCurrency(total)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.arAging', 'AR Aging')}</h1>
          <p className="text-body text-slate mt-1">{t('accounting.arAgingSubtitle', 'Accounts receivable aging analysis')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>Print</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {bucketCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="text-center py-6">
              <p className={`text-3xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
              <p className="text-caption text-slate mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{s.dso || 0}</p>
            <p className="text-caption text-slate">Days Sales Outstanding (DSO)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-green-600">{s.netCollectionRate || 0}%</p>
            <p className="text-caption text-slate">Net Collection Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{formatCurrency(s.totalOutstanding || 0)}</p>
            <p className="text-caption text-slate">Total Outstanding</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('accounting.outstandingBalances', 'Outstanding Balances')}</CardTitle></CardHeader>
        <CardContent>
          {aging.length === 0 ? (
            <p className="text-body text-slate text-center py-8">{t('accounting.noOutstanding', 'No outstanding balances')}</p>
          ) : (
            <Table columns={columns} data={aging} />
          )}
        </CardContent>
      </Card>

      <Modal open={!!selectedPatient} onClose={() => setSelectedPatient(null)} title="Patient Aging Detail" className="max-w-xl">
        {selectedPatient && (
          <div className="space-y-4">
            <div className="bg-bone rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate">Patient</span>
                <span className="text-obsidian font-medium">{selectedPatient.patient?.firstName || ''} {selectedPatient.patient?.lastName || ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">MRN</span>
                <span className="text-obsidian">{selectedPatient.patient?.mrn || '-'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-green-600">{formatCurrency(selectedPatient.current30 || 0)}</p>
                <p className="text-xs text-slate">0–30 Days</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-amber-600">{formatCurrency(selectedPatient.current31to60 || 0)}</p>
                <p className="text-xs text-slate">31–60 Days</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-orange-600">{formatCurrency(selectedPatient.current61to90 || 0)}</p>
                <p className="text-xs text-slate">61–90 Days</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-red-600">{formatCurrency(selectedPatient.over90 || 0)}</p>
                <p className="text-xs text-slate">90+ Days</p>
              </div>
            </div>
            {selectedPatient.invoices && selectedPatient.invoices.length > 0 && (
              <div>
                <p className="text-sm font-medium text-graphite mb-2">Related Invoices</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {selectedPatient.invoices.map((inv) => (
                    <div key={inv.id} className="flex justify-between p-2 border border-silver/50 rounded text-sm">
                      <span className="text-obsidian">{inv.invoiceNumber}</span>
                      <span className="font-medium">{formatCurrency(inv.balance || inv.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedPatient(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
