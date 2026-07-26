import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLabOrders } from '../../hooks/queries/useLab';
import { api } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';

const statusBadge = {
  SUBMITTED: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const flagColors = {
  NORMAL: 'success',
  HIGH: 'warning',
  LOW: 'info',
  CRITICAL_HIGH: 'danger',
  CRITICAL_LOW: 'danger',
  ABNORMAL: 'warning',
};

export default function LabReportsTab() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const reportRef = useRef(null);

  const { data: orders = [], isLoading, error } = useLabOrders('status=COMPLETED');

  const filteredOrders = orders.filter((order) => {
    const d = new Date(order.createdAt);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const handleViewReport = useCallback(async (order) => {
    setSelectedOrder(order);
    setShowReport(true);
    setReportLoading(true);
    try {
      const data = await api.get(`/lab/orders/${order.id}/report`);
      setReportData(data);
    } catch {
      setReportData(null);
    }
    setReportLoading(false);
  }, []);

  const handlePrint = useCallback(() => {
    const content = reportRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Lab Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-bottom: 16px; color: #555; }
        .info { margin-bottom: 12px; font-size: 13px; }
        .info p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: 600; }
        .flag-normal { color: #16a34a; }
        .flag-high { color: #d97706; }
        .flag-low { color: #2563eb; }
        .flag-critical { color: #dc2626; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 11px; color: #888; text-align: center; }
      </style></head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-8 text-center">
        <p className="text-sm text-red-700 dark:text-red-300">{t('common.error')}: {error.message || 'Failed to load reports'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="w-48">
          <Input
            label={t('lab.dateFrom')}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Input
            label={t('lab.dateTo')}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body text-slate">{t('lab.noReports')}</p>
        </div>
      ) : (
        <Table
          columns={[
            { key: 'patient', label: t('lab.patient'), render: (r) => r.patient?.fullName || '-' },
            { key: 'date', label: t('lab.date'), render: (r) => new Date(r.createdAt).toLocaleDateString() },
            { key: 'tests', label: t('lab.testsCount'), render: (r) => r.tests?.length || 0 },
            { key: 'status', label: t('lab.status'), render: (r) => (
              <Badge variant={statusBadge[r.status]}>{t('lab.' + r.status.toLowerCase())}</Badge>
            )},
            { key: 'actions', label: t('lab.actions'), render: (r) => (
              <button onClick={(e) => { e.stopPropagation(); handleViewReport(r); }} className="text-lilac-bloom hover:underline text-caption px-1">
                {t('lab.viewReport')}
              </button>
            )},
          ]}
          data={filteredOrders}
          onRowClick={(r) => handleViewReport(r)}
        />
      )}

      {showReport && (
        <Modal open={showReport} onClose={() => { setShowReport(false); setReportData(null); }} title={t('lab.report')} className="max-w-3xl">
          {reportLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reportData ? (
            <div className="space-y-4">
              <div ref={reportRef} className="space-y-4">
                <div className="text-center border-b border-silver pb-4">
                  <h1 className="text-heading font-medium text-obsidian">Al Jawahir Hospital</h1>
                  <h2 className="text-subheading text-slate">Laboratory Report</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 text-caption">
                  <div>
                    <p className="font-medium text-obsidian">Patient Information</p>
                    <p className="text-slate">Name: {reportData.patient?.fullName || '-'}</p>
                    <p className="text-slate">MRN: {reportData.patient?.mrn || '-'}</p>
                    {reportData.patient?.dateOfBirth && (
                      <p className="text-slate">DOB: {new Date(reportData.patient.dateOfBirth).toLocaleDateString()}</p>
                    )}
                    {reportData.patient?.gender && (
                      <p className="text-slate">Gender: {reportData.patient.gender}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-obsidian">Order Information</p>
                    <p className="text-slate">Order ID: {reportData.id?.slice(0, 8)}...</p>
                    <p className="text-slate">Date: {new Date(reportData.createdAt).toLocaleDateString()}</p>
                    <p className="text-slate">Requested by: {reportData.requestedBy?.fullName || '-'}</p>
                    {reportData.assignedTo && (
                      <p className="text-slate">Assigned to: {reportData.assignedTo.fullName || '-'}</p>
                    )}
                  </div>
                </div>

                {reportData.tests?.length > 0 && (
                  <table className="w-full border-collapse border border-silver text-caption">
                    <thead>
                      <tr className="bg-bone">
                        <th className="border border-silver px-3 py-2 text-left font-medium text-obsidian">Test</th>
                        <th className="border border-silver px-3 py-2 text-left font-medium text-obsidian">Value</th>
                        <th className="border border-silver px-3 py-2 text-left font-medium text-obsidian">Unit</th>
                        <th className="border border-silver px-3 py-2 text-left font-medium text-obsidian">Ref Range</th>
                        <th className="border border-silver px-3 py-2 text-left font-medium text-obsidian">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.tests.map((ot) => {
                        const refRange = ot.refRangeText || (ot.refRangeLow != null && ot.refRangeHigh != null ? `${ot.refRangeLow} - ${ot.refRangeHigh}` : '-');
                        const flagClass = ot.flag === 'NORMAL' ? 'flag-normal'
                          : (ot.flag === 'HIGH' || ot.flag === 'CRITICAL_HIGH') ? 'flag-high'
                          : (ot.flag === 'LOW' || ot.flag === 'CRITICAL_LOW') ? 'flag-low'
                          : 'flag-critical';
                        return (
                          <tr key={ot.id}>
                            <td className="border border-silver px-3 py-2 text-obsidian">{ot.test?.name || '-'}</td>
                            <td className="border border-silver px-3 py-2 text-obsidian font-medium">{ot.value || '-'}</td>
                            <td className="border border-silver px-3 py-2 text-slate">{ot.unit || ot.test?.unit || '-'}</td>
                            <td className="border border-silver px-3 py-2 text-slate">{refRange}</td>
                            <td className={`border border-silver px-3 py-2 font-medium ${flagClass}`}>{ot.flag || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {reportData.resultNotes && (
                  <div className="bg-bone rounded-lg p-3">
                    <p className="text-caption font-medium text-obsidian mb-1">Notes</p>
                    <p className="text-caption text-slate">{reportData.resultNotes}</p>
                  </div>
                )}

                <div className="text-center text-caption text-slate border-t border-silver pt-3">
                  Report generated on {new Date().toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handlePrint}>{t('lab.printReport')}</Button>
                <Button variant="secondary" onClick={() => { setShowReport(false); setReportData(null); }}>{t('common.close')}</Button>
              </div>
            </div>
          ) : (
            <p className="text-body text-slate text-center py-8">{t('common.error')}: Failed to load report data</p>
          )}
        </Modal>
      )}
    </div>
  );
}
