import { useState, useMemo } from 'react';
import { useSurgeryAvailability, useCreateSurgery } from '../../hooks/queries/useSurgery';
import { useWards } from '../../hooks/queries/useWards';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const OR_ROOMS = [1, 2, 3, 4, 5];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

export default function SurgeryScheduler() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [orRoom, setOrRoom] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [disposition, setDisposition] = useState('PENDING');
  const [admittedWardId, setAdmittedWardId] = useState('');

  const { data: availability = [] } = useSurgeryAvailability(date);
  const { data: wards = [] } = useWards();
  const createSurgery = useCreateSurgery();

  const bookedSlots = useMemo(() => {
    const map = {};
    availability.forEach(({ room, booked }) => {
      map[room] = booked.map((s) => ({
        start: new Date(s.startTime).getHours() * 60 + new Date(s.startTime).getMinutes(),
        end: new Date(s.endTime).getHours() * 60 + new Date(s.endTime).getMinutes(),
        id: s.id,
      }));
    });
    return map;
  }, [availability]);

  const isTimeSlotFree = (roomNum, startMins, endMins) => {
    const slots = bookedSlots[roomNum] || [];
    return !slots.some((s) => startMins < s.end && endMins > s.start);
  };

  const handlePatientSearch = async () => {
    if (!patientSearch.trim()) return;
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(patientSearch)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setPatientResults(data);
    } catch { }
  };

  const handleSubmit = () => {
    if (!patientId || !orRoom || !startTime || !endTime) {
      toast.error('Patient, OR room, start and end times required');
      return;
    }

    const startDt = `${date}T${startTime}:00`;
    const endDt = `${date}T${endTime}:00`;

    createSurgery.mutate(
      {
        patientId,
        orRoom: parseInt(orRoom, 10),
        startTime: startDt,
        endTime: endDt,
        notes: notes || undefined,
        disposition,
        admittedWardId: disposition === 'ADMIT_WARD' ? admittedWardId || undefined : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Surgery scheduled');
          setPatientId('');
          setPatientSearch('');
          setPatientResults([]);
          setOrRoom('');
          setStartTime('08:00');
          setEndTime('09:00');
          setNotes('');
          setDisposition('PENDING');
          setAdmittedWardId('');
        },
        onError: (err) => toast.error(err.message || 'Failed to schedule'),
      }
    );
  };

  const ganttStart = 7 * 60;
  const totalMins = 14 * 60;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Surgery Scheduler</h1>
          <p className="text-body text-slate mt-1">Schedule surgeries and manage OR availability</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="sched-date" className="text-sm font-medium text-graphite">Date</label>
          <input
            id="sched-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>OR Availability — {date}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="flex" style={{ paddingLeft: '80px' }}>
                  {HOURS.map((h) => (
                    <div key={h} className="flex-1 text-caption text-slate text-center border-l border-silver py-1">
                      {h > 12 ? `${h - 12}pm` : `${h}am`}
                    </div>
                  ))}
                </div>
                {OR_ROOMS.map((room) => {
                  const booked = availability.find((a) => a.room === room)?.booked || [];
                  return (
                    <div key={room} className="flex mb-2">
                      <div className="w-[80px] shrink-0 flex items-center px-2">
                        <span className="text-body font-medium text-obsidian">OR {room}</span>
                      </div>
                      <div className="flex-1 relative h-16 bg-bone/50 rounded-lg border border-silver/30">
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className="absolute top-0 bottom-0 border-l border-silver/20"
                            style={{ left: `${((h - 7) / 14) * 100}%`, width: `${(1 / 14) * 100}%` }}
                          />
                        ))}
                        {booked.map((s) => {
                          const start = new Date(s.startTime);
                          const end = new Date(s.endTime);
                          const left = Math.max(((start.getHours() * 60 + start.getMinutes() - ganttStart) / totalMins) * 100, 0);
                          const width = Math.min((((end - start) / 60000) / totalMins) * 100, 100 - left);
                          return (
                            <div
                              key={s.id}
                              className="absolute top-1 bottom-1 rounded-md bg-lilac-bloom/40 border border-lilac-bloom px-1 overflow-hidden"
                              style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                            >
                              <span className="text-[10px] font-medium text-obsidian truncate block">
                                #{String(s.id).slice(-4)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Surgery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1">Patient</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePatientSearch()}
                  placeholder="Search by name or MRN..."
                />
                <Button size="sm" onClick={handlePatientSearch}>Search</Button>
              </div>
              {patientResults.length > 0 && (
                <div className="mt-2 border border-silver rounded-lg divide-y divide-silver max-h-40 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-body hover:bg-bone transition-colors ${patientId === p.id ? 'bg-lilac-bloom/10' : ''}`}
                      onClick={() => { setPatientId(p.id); setPatientSearch(`${p.fullName} (${p.mrn})`); setPatientResults([]); }}
                    >
                      <span className="font-medium text-obsidian">{p.fullName}</span>
                      <span className="text-caption text-slate ml-2">{p.mrn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-graphite mb-1">OR Room</label>
              <select
                value={orRoom}
                onChange={(e) => setOrRoom(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              >
                <option value="">Select OR...</option>
                {OR_ROOMS.map((r) => (
                  <option key={r} value={r}>OR {r}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-graphite mb-1">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-graphite mb-1">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-graphite mb-1">Post-Op Disposition</label>
              <div className="flex gap-2">
                {['PENDING', 'DISCHARGE_HOME', 'ADMIT_WARD'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${disposition === d ? 'bg-lilac-bloom text-paper border-lilac-bloom' : 'bg-paper text-graphite border-silver hover:border-lilac-bloom/50'}`}
                    onClick={() => setDisposition(d)}
                  >
                    {d === 'PENDING' ? 'To Decide' : d === 'DISCHARGE_HOME' ? 'Home' : 'Admit'}
                  </button>
                ))}
              </div>
            </div>

            {disposition === 'ADMIT_WARD' && (
              <div>
                <label className="block text-sm font-medium text-graphite mb-1">Ward</label>
                <select
                  value={admittedWardId}
                  onChange={(e) => setAdmittedWardId(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                >
                  <option value="">Select ward...</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-graphite mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              loading={createSurgery.isPending}
              disabled={!patientId || !orRoom}
            >
              Schedule Surgery
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
