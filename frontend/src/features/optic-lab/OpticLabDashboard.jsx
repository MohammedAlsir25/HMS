import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useOpticLabJobs, useOpticLabStats, useUpdateLabJobStatus, useOpticLabCustomers } from '../../hooks/queries/useOpticLab';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { notifySuccess, notifyError } from '../../utils/notify';

const COLUMNS = [
  { key: 'NEW', label: 'New', color: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' },
  { key: 'COMPLETED', label: 'Completed', color: 'border-green-400 bg-green-50 dark:bg-green-900/20' },
];

function KanbanCard({ job, onMove }) {
  const nextStatus = job.status === 'NEW' ? 'IN_PROGRESS' : job.status === 'IN_PROGRESS' ? 'COMPLETED' : null;
  const prevStatus = job.status === 'IN_PROGRESS' ? 'NEW' : null;

  return (
    <div className="bg-paper border border-silver rounded-lg p-3 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-obsidian text-sm">{job.jobNumber}</span>
        {job.status !== 'COMPLETED' && (
          <div className="flex gap-1">
            {prevStatus && (
              <button
                onClick={() => onMove(job.id, prevStatus)}
                className="w-10 h-10 flex items-center justify-center rounded border border-slate/30 text-slate hover:text-obsidian hover:bg-bone hover:border-slate/60 transition-colors"
                title="Move back"
              ><ArrowLeft size={20} /></button>
            )}
            {nextStatus && (
              <button
                onClick={() => onMove(job.id, nextStatus)}
                className="w-10 h-10 flex items-center justify-center rounded border border-lilac-bloom/50 text-lilac-bloom hover:text-white hover:bg-lilac-bloom hover:border-lilac-bloom transition-colors"
                title={nextStatus === 'COMPLETED' ? 'Complete' : 'Start'}
              >{nextStatus === 'COMPLETED' ? <Check size={20} /> : <ArrowRight size={20} />}</button>
            )}
        </div>
        )}
      </div>
      <p className="text-body font-medium text-obsidian">{job.customerName || '—'}</p>
      <div className="text-caption text-graphite space-y-0.5">
        {job.frameName && <p>Frame: {job.frameName}{job.frameSku ? ` (${job.frameSku})` : ''}</p>}
        {job.sphOD && (
          <p>
            OD: SPH {job.sphOD}{job.cylOD ? ` / CYL ${job.cylOD}` : ''}{job.axisOD ? ` / AXIS ${job.axisOD}` : ''}
          </p>
        )}
        {job.sphOS && (
          <p>
            OS: SPH {job.sphOS}{job.cylOS ? ` / CYL ${job.cylOS}` : ''}{job.axisOS ? ` / AXIS ${job.axisOS}` : ''}
          </p>
        )}
      </div>
      {job.startedAt && (
        <p className="text-caption text-slate">Started: {new Date(job.startedAt).toLocaleString()}</p>
      )}
      {job.completedAt && (
        <p className="text-caption text-slate">Completed: {new Date(job.completedAt).toLocaleString()}</p>
      )}
    </div>
  );
}

export default function OpticLabDashboard() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('board');
  const { data: allJobs = [], isLoading } = useOpticLabJobs();
  const { data: stats } = useOpticLabStats();
  const { data: customers = [] } = useOpticLabCustomers();
  const updateStatus = useUpdateLabJobStatus();
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const handleMove = (id, status) => {
    const labels = { NEW: 'New', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' };
    setConfirmAction({ id, status, label: labels[status] });
  };

  const handleConfirmMove = async () => {
    if (!confirmAction) return;
    setConfirming(true);
    try {
      await updateStatus.mutateAsync({ id: confirmAction.id, status: confirmAction.status });
      notifySuccess(`Job moved to ${confirmAction.label}`);
    } catch (err) {
      notifyError(err);
    }
    setConfirmAction(null);
    setConfirming(false);
  };

  const filtered = allJobs.filter((j) =>
    !search ||
    j.jobNumber.toLowerCase().includes(search.toLowerCase()) ||
    (j.customerName || '').toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Optic Lab</h1>
          <p className="text-body text-slate mt-1">Dashboard for glasses cutting & finishing</p>
        </div>
        <div className="flex items-center gap-3">
          {stats && tab === 'board' && (
            <div className="flex gap-3 text-sm">
              <span className="text-amber-600 font-medium">NEW: {stats.NEW}</span>
              <span className="text-blue-600 font-medium">In Progress: {stats.IN_PROGRESS}</span>
              <span className="text-green-600 font-medium">Done: {stats.COMPLETED}</span>
            </div>
          )}
          <Input
            placeholder={tab === 'board' ? "Search by job or customer..." : "Search customers..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
      </div>

      <div className="flex gap-4 border-b border-silver">
        <button
          onClick={() => { setTab('board'); setSearch(''); }}
          className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${tab === 'board' ? 'border-lilac-bloom text-obsidian' : 'border-transparent text-slate hover:text-graphite'}`}
        >
          Kanban Board
        </button>
        <button
          onClick={() => { setTab('customers'); setSearch(''); }}
          className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${tab === 'customers' ? 'border-lilac-bloom text-obsidian' : 'border-transparent text-slate hover:text-graphite'}`}
        >
          Customers
        </button>
      </div>

      {tab === 'board' ? (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const jobs = filtered.filter((j) => j.status === col.key);
            return (
              <div key={col.key} className={`border-t-4 rounded-lg ${col.color} p-3 min-h-[200px]`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-subheading font-semibold text-obsidian">{col.label}</h2>
                  <span className="text-sm font-medium text-slate bg-paper px-2 py-0.5 rounded-full">{jobs.length}</span>
                </div>
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <KanbanCard key={job.id} job={job} onMove={handleMove} />
                  ))}
                  {jobs.length === 0 && (
                    <p className="text-body text-slate text-center py-6">No jobs</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm Status Change">
        <p className="text-body text-obsidian mb-6">
          Move job to <strong>{confirmAction?.label}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button onClick={handleConfirmMove} loading={confirming} disabled={confirming}>Confirm</Button>
        </div>
      </Modal>
      </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-silver">
                <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Customer Name</th>
                <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Phone</th>
                <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Jobs</th>
                <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Last Frame</th>
                <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Last Prescription</th>
                <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              {(customers || [])
                .filter((c) =>
                  !search ||
                  c.customerName.toLowerCase().includes(search.toLowerCase()) ||
                  (c.customerPhone || '').includes(search)
                )
                .map((c, i) => (
                  <tr key={i} className="border-b border-bone hover:bg-bone/50 transition-colors">
                    <td className="py-2 px-3 font-medium text-obsidian">{c.customerName}</td>
                    <td className="py-2 px-3 text-graphite">{c.customerPhone || '—'}</td>
                    <td className="py-2 px-3 text-obsidian">{c.jobCount}</td>
                    <td className="py-2 px-3 text-graphite">{c.lastFrame || '—'}</td>
                    <td className="py-2 px-3 text-caption text-graphite">{c.lastPrescription || '—'}</td>
                    <td className="py-2 px-3 text-slate text-caption">{c.lastPurchase || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <p className="text-body text-slate text-center py-8">No customers yet</p>
          )}
        </div>
      )}
    </div>
  );
}
