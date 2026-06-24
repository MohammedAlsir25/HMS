import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

const OR_ROOMS = [1, 2, 3, 4, 5];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

const statusColors = {
  SCHEDULED: { bg: 'bg-lilac-bloom/30', border: 'border-lilac-bloom', label: 'bg-lilac-bloom text-obsidian' },
  PREP: { bg: 'bg-amber-100 dark:bg-amber-900', border: 'border-amber-300 dark:border-amber-700', label: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  IN_SURGERY: { bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-300 dark:border-green-700', label: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  RECOVERY: { bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-300 dark:border-purple-700', label: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  CANCELLED: { bg: 'bg-red-100 dark:bg-red-900', border: 'border-red-300 dark:border-red-700', label: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const statusFlow = {
  SCHEDULED: 'PREP',
  PREP: 'IN_SURGERY',
  IN_SURGERY: 'RECOVERY',
  RECOVERY: 'COMPLETED',
};

function toMins(d) {
  return d.getHours() * 60 + d.getMinutes();
}

export default function SurgeryGantt() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurgery, setSelectedSurgery] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/surgeries?date=${date}`)
      .then(setSurgeries)
      .catch(() => setSurgeries([]))
      .finally(() => setLoading(false));
  }, [date]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.patch(`/surgeries/${id}/status`, { status });
      setSurgeries((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (selectedSurgery?.id === id) setSelectedSurgery(updated);
    } catch { /* ignore */ }
  };

  const ganttStart = 7 * 60;
  const ganttEnd = 21 * 60;
  const totalMins = ganttEnd - ganttStart;

  const byRoom = {};
  OR_ROOMS.forEach((r) => { byRoom[r] = []; });
  surgeries.forEach((s) => {
    if (byRoom[s.orRoom]) byRoom[s.orRoom].push(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Surgery Schedule</h1>
          <p className="text-body text-slate mt-1">OR Gantt Chart — drag to scroll</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="surgery-date" className="text-sm font-medium text-graphite">Date</label>
          <input
            id="surgery-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian
              focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex" style={{ paddingLeft: '120px' }}>
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-caption text-slate text-center border-l border-silver py-1">
                {h > 12 ? `${h - 12}pm` : `${h}am`}
              </div>
            ))}
          </div>

          {OR_ROOMS.map((room) => {
            const roomSurgeries = byRoom[room] || [];
            return (
              <div key={room} className="flex mb-2">
                <div className="w-[120px] shrink-0 flex items-center px-3">
                  <span className="text-body font-medium text-obsidian">OR {room}</span>
                  <span className="text-caption text-slate ml-2">({roomSurgeries.length})</span>
                </div>
                <div className="flex-1 relative h-20 bg-bone/50 rounded-lg border border-silver/30">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-silver/20"
                      style={{ left: `${((h - 7) / 14) * 100}%`, width: `${(1 / 14) * 100}%` }}
                    />
                  ))}
                  {roomSurgeries.map((s) => {
                    const start = toMins(new Date(s.startTime));
                    const end = toMins(new Date(s.endTime));
                    const left = Math.max(((start - ganttStart) / totalMins) * 100, 0);
                    const width = Math.min(((end - start) / totalMins) * 100, 100 - left);
                    const colors = statusColors[s.status] || statusColors.SCHEDULED;
                    const nextStatus = statusFlow[s.status];
                    return (
                      <button
                        key={s.id}
                        className={`absolute top-1 bottom-1 rounded-md border px-2 overflow-hidden
                          transition-all hover:shadow-md cursor-pointer touch-target
                          ${colors.bg} ${colors.border}
                          ${selectedSurgery?.id === s.id ? 'ring-2 ring-lilac-bloom z-10' : 'z-0'}`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                        onClick={() => setSelectedSurgery(selectedSurgery?.id === s.id ? null : s)}
                      >
                        <div className="flex items-center gap-1 h-full">
                          <span className="text-xs font-semibold text-obsidian truncate">
                            #{String(s.patient?.mrn || '').slice(-4)}
                          </span>
                          {width > 8 && (
                            <span className="text-xs text-graphite truncate">{s.patient?.fullName}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedSurgery && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Surgery Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-slate">Patient</p>
                  <p className="text-body font-medium text-obsidian">{selectedSurgery.patient?.fullName}</p>
                  <p className="text-caption text-slate">{selectedSurgery.patient?.mrn}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">OR Room</p>
                  <p className="text-body font-medium text-obsidian">OR {selectedSurgery.orRoom}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">Start</p>
                  <p className="text-body text-obsidian">{new Date(selectedSurgery.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">End</p>
                  <p className="text-body text-obsidian">{new Date(selectedSurgery.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {selectedSurgery.notes && (
                  <div className="col-span-2">
                    <p className="text-caption text-slate">Notes</p>
                    <p className="text-body text-obsidian">{selectedSurgery.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedSurgery.status !== 'CANCELLED' && (
                <p className="text-body text-obsidian">
                  Current: <Badge variant={
                    selectedSurgery.status === 'SCHEDULED' ? 'primary' :
                    selectedSurgery.status === 'PREP' ? 'warning' :
                    selectedSurgery.status === 'IN_SURGERY' ? 'info' :
                    selectedSurgery.status === 'RECOVERY' ? 'info' : 'default'
                  }>{selectedSurgery.status}</Badge>
                </p>
              )}
              <div className="flex flex-col gap-2">
                {nextStatus && (
                  <Button onClick={() => handleStatusChange(selectedSurgery.id, nextStatus)}>
                    Advance to {nextStatus.replace('_', ' ')}
                  </Button>
                )}
                {selectedSurgery.status !== 'COMPLETED' && selectedSurgery.status !== 'CANCELLED' && (
                  <Button variant="danger" onClick={() => handleStatusChange(selectedSurgery.id, 'CANCELLED')}>
                    Cancel Surgery
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
