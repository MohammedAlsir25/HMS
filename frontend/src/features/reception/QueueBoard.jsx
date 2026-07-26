import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useReceptionQueue, useUpdateAppointmentStatus, useUpdateAppointmentPriority, useCallNext } from '../../hooks/queries/useReception';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

function calcAge(dob) {
  if (!dob) return null;
  const diff = new Date() - new Date(dob);
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatWaitTime(createdAt) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const statusLabels = {
  WAITING: 'Waiting',
  CALLED: 'Called',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const statusTransitions = {
  WAITING: [{ label: 'Call', status: 'CALLED', variant: 'primary' }],
  CALLED: [{ label: 'Start', status: 'IN_PROGRESS', variant: 'primary' }],
  IN_PROGRESS: [{ label: 'Complete', status: 'COMPLETED', variant: 'primary' }],
  COMPLETED: [],
};

const columnColors = {
  WAITING: 'border-amber-200 dark:border-amber-700',
  CALLED: 'border-sky-200 dark:border-sky-700',
  IN_PROGRESS: 'border-green-200 dark:border-green-700',
  COMPLETED: 'border-gray-200 dark:border-gray-700',
};

const columnHeaderColors = {
  WAITING: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  CALLED: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300',
  IN_PROGRESS: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  COMPLETED: 'bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400',
};

const typeVariant = {
  WALKIN: 'default',
  RESERVATION: 'info',
};

const priorityVariant = (p) => {
  if (p >= 4) return 'danger';
  if (p >= 2) return 'warning';
  return 'default';
};

export default function QueueBoard({ clinicId }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: queue = [], isLoading } = useReceptionQueue(clinicId, 15000);
  const updateStatus = useUpdateAppointmentStatus();
  const updatePriority = useUpdateAppointmentPriority();
  const callNext = useCallNext();

  const columns = useMemo(() => ({
    WAITING: queue.filter((a) => a.status === 'WAITING'),
    CALLED: queue.filter((a) => a.status === 'CALLED'),
    IN_PROGRESS: queue.filter((a) => a.status === 'IN_PROGRESS'),
    COMPLETED: queue.filter((a) => a.status === 'COMPLETED'),
  }), [queue]);

  const filteredColumns = useMemo(() => {
    if (!searchQuery) return columns;
    const q = searchQuery.toLowerCase();
    return Object.fromEntries(
      Object.entries(columns).map(([status, items]) => [
        status,
        items.filter(
          (a) =>
            a.patient?.fullName?.toLowerCase().includes(q) ||
            a.patient?.mrn?.toLowerCase().includes(q)
        ),
      ])
    );
  }, [columns, searchQuery]);

  if (!clinicId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-body text-slate">Select a clinic to view the queue board</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalPatients = queue.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-slate" />
          <Input
            placeholder="Search by name or MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-caption text-slate">{totalPatients} patient{totalPatients !== 1 ? 's' : ''}</span>
          {columns.WAITING.length > 0 && (
            <Button size="sm" onClick={() => callNext.mutate(clinicId)} loading={callNext.isPending}>
              Call Next
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
          <div key={status} className={`bg-bone/50 rounded-xl p-3 space-y-3 border ${columnColors[status]}`}>
            <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${columnHeaderColors[status]}`}>
              <h3 className="text-caption font-semibold uppercase tracking-wide">
                {statusLabels[status]}
              </h3>
              <span className="text-caption font-bold">{filteredColumns[status].length}</span>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredColumns[status].length === 0 && (
                <p className="text-caption text-slate text-center py-4 italic">Empty</p>
              )}
              {filteredColumns[status].map((appt) => {
                const age = calcAge(appt.patient?.dateOfBirth);
                return (
                  <Card key={appt.id} className="p-3 space-y-2 !bg-paper">
                    <div className="flex items-center justify-between">
                      <span className="text-h3 font-bold text-obsidian">
                        #{String(appt.token).padStart(3, '0')}
                      </span>
                      <Badge variant={priorityVariant(appt.priority)} size="sm">P{appt.priority}</Badge>
                    </div>
                    <div>
                      <p className="text-body font-medium text-obsidian truncate">{appt.patient?.fullName}</p>
                      <p className="text-caption text-slate">
                        {appt.patient?.mrn}
                        {age !== null ? ` · ${age}y` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={typeVariant[appt.type] || 'default'} size="sm">
                        {appt.type === 'WALKIN' ? 'Walk-in' : 'Reservation'}
                      </Badge>
                      {status === 'WAITING' && appt.createdAt && (
                        <span className="text-caption text-slate ml-auto">{formatWaitTime(appt.createdAt)}</span>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {statusTransitions[status].map((action) => (
                        <Button
                          key={action.status}
                          size="sm"
                          variant={action.variant}
                          onClick={() => updateStatus.mutate({ id: appt.id, status: action.status })}
                          loading={updateStatus.isPending}
                        >
                          {action.label}
                        </Button>
                      ))}
                      {['WAITING', 'CALLED'].includes(status) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: appt.id, status: 'CANCELLED' })}>
                            Cancel
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: appt.id, status: 'NO_SHOW' })}>
                            No-Show
                          </Button>
                        </>
                      )}
                    </div>
                    <select
                      value={appt.priority}
                      onChange={(e) => updatePriority.mutate({ id: appt.id, priority: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-caption bg-paper border border-silver rounded-lg focus:outline-none focus:ring-1 focus:ring-lilac-bloom"
                    >
                      {[0, 1, 2, 3, 4, 5].map((p) => (
                        <option key={p} value={p}>{p === 0 ? 'Normal' : `P${p}`}</option>
                      ))}
                    </select>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
