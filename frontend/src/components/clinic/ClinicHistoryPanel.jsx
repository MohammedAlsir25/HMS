import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Table } from '../ui/Table';
import { useClinicHistory, usePrintReport } from '../../hooks/queries/useClinics';
import OptometryReportPrint from '../../features/clinics/OptometryReportPrint';

const statusBadge = {
  COMPLETED: { label: 'Completed', variant: 'success' },
  NO_SHOW: { label: 'No Show', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'warning' },
};

export default function ClinicHistoryPanel({ clinicSlug }) {
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [printData, setPrintData] = useState(null);
  const printMutation = usePrintReport(clinicSlug);

  const { data, isLoading } = useClinicHistory(clinicSlug, { q: search, from: fromDate, to: toDate, page, limit: 20 });

  const appointments = data?.data || [];
  const { total = 0, totalPages = 0 } = data?.pagination || {};

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Patient History</CardTitle>
            {total > 0 && <span className="text-caption text-slate">{total} records</span>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Search Patient"
                placeholder="Search by name or MRN..."
                value={search}
                onChange={handleSearch}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
          </div>

          {isLoading && (
            <p className="text-body text-slate py-8 text-center">Loading history...</p>
          )}

          {!isLoading && appointments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-silver mb-3">
                <path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              </svg>
              <p className="text-body font-medium text-slate">No history found</p>
              <p className="text-caption text-slate mt-1">Try adjusting your search or date filters</p>
            </div>
          )}

          {!isLoading && appointments.length > 0 && (
            <>
              <Table
                columns={[
                  {
                    key: 'date',
                    label: 'Date',
                    render: (a) => new Date(a.updatedAt || a.createdAt).toLocaleDateString(),
                  },
                  { key: 'token', label: 'Token', render: (a) => `#${String(a.token).padStart(3, '0')}` },
                  { key: 'patient', label: 'Patient', render: (a) => a.patient?.fullName || '-' },
                  { key: 'mrn', label: 'MRN', render: (a) => a.patient?.mrn || '-' },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (a) => {
                      const cfg = statusBadge[a.status] || { label: a.status, variant: 'default' };
                      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
                    },
                  },
                  {
                    key: 'diagnosis',
                    label: 'Diagnosis',
                    render: (a) => a.clinicalRecord?.diagnosis
                      ? <span className="truncate max-w-[200px] block">{a.clinicalRecord.diagnosis}</span>
                      : <span className="text-slate">-</span>,
                  },
                  {
                    key: 'actions',
                    label: '',
                    render: (a) => a.clinicalRecord?.diagnosis || a.clinicalRecord?.prescriptions || a.clinicalRecord?.notes ? (
                      <Button size="sm" variant="ghost" onClick={() => setSelectedRecord(a.clinicalRecord)}>
                        View Record
                      </Button>
                    ) : null,
                  },
                ]}
                data={appointments}
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-caption text-slate">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {printData && (
        <OptometryReportPrint printData={printData} onClose={() => setPrintData(null)} />
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedRecord(null)}>
          <div className="bg-paper rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-silver">
              <h3 className="text-subheading font-semibold text-obsidian">Clinical Record</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const data = await printMutation.mutateAsync(selectedRecord.id);
                      setPrintData(data);
                    } catch {}
                  }}
                >
                  Print
                </Button>
                <button onClick={() => setSelectedRecord(null)} className="text-slate hover:text-obsidian touch-target">&times;</button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-caption text-slate">{new Date(selectedRecord.encounterDate).toLocaleString()}</p>
              {selectedRecord.diagnosis && (
                <div>
                  <p className="text-caption font-medium text-graphite">Diagnosis</p>
                  <p className="text-body text-obsidian">{selectedRecord.diagnosis}</p>
                </div>
              )}
              {selectedRecord.prescriptions && (
                <div>
                  <p className="text-caption font-medium text-graphite">Prescriptions</p>
                  <p className="text-body text-obsidian">{selectedRecord.prescriptions}</p>
                </div>
              )}
              {selectedRecord.notes && (
                <div>
                  <p className="text-caption font-medium text-graphite">Notes</p>
                  <p className="text-body text-obsidian whitespace-pre-wrap">{selectedRecord.notes}</p>
                </div>
              )}
              {!selectedRecord.diagnosis && !selectedRecord.prescriptions && !selectedRecord.notes && (
                <p className="text-body text-slate">No clinical data recorded for this visit.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}