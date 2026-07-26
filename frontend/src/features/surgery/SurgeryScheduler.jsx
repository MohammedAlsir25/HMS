import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSurgeryAvailability, useCreateSurgery } from '../../hooks/queries/useSurgery';
import { useWards } from '../../hooks/queries/useWards';
import { usePatientSearch } from '../../hooks/usePatients';
import { useOperationTypes } from '../../hooks/queries/usePreoperative';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const OR_ROOMS = [1, 2, 3, 4, 5];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

export default function SurgeryScheduler() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [departmentId, setDepartmentId] = useState('');
  const [operationTypeId, setOperationTypeId] = useState('');
  const [anesthesiaType, setAnesthesiaType] = useState('');
  const [orRoom, setOrRoom] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [disposition, setDisposition] = useState('PENDING');
  const [admittedWardId, setAdmittedWardId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, loading: searching, selectedPatient, selectPatient } = usePatientSearch();

  const { data: availability = [], isLoading: availabilityLoading, isError: availabilityError, error: availabilityErr, refetch: refetchAvailability } = useSurgeryAvailability(date);
  const { data: wards = [] } = useWards();
  const { data: operationTypes = [] } = useOperationTypes(departmentId);
  const createSurgery = useCreateSurgery();

  const fetchDepartments = useCallback(async () => {
    if (departments.length > 0) return;
    setLoadingDepts(true);
    try {
      const data = await api.get('/departments?type=SURGERY');
      setDepartments(data);
    } catch {
    } finally {
      setLoadingDepts(false);
    }
  }, [departments.length]);

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

  const handleSubmit = () => {
    if (!selectedPatient || !departmentId || !orRoom || !startTime || !endTime) {
      toast.error(t('surgery.scheduler.validationError'));
      return;
    }

    const startDt = `${date}T${startTime}:00`;
    const endDt = `${date}T${endTime}:00`;

    createSurgery.mutate(
      {
        patientId: selectedPatient.id,
        departmentId,
        operationTypeId: operationTypeId || undefined,
        orRoom: parseInt(orRoom, 10),
        startTime: startDt,
        endTime: endDt,
        notes: notes || undefined,
        disposition,
        admittedWardId: disposition === 'ADMIT_WARD' ? admittedWardId || undefined : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('surgery.scheduler.scheduled'));
          selectPatient(null);
          setDepartmentId('');
          setOperationTypeId('');
          setAnesthesiaType('');
          setOrRoom('');
          setStartTime('08:00');
          setEndTime('09:00');
          setNotes('');
          setDisposition('PENDING');
          setAdmittedWardId('');
        },
        onError: (err) => toast.error(err.message || t('surgery.scheduler.scheduleFailed')),
      }
    );
  };

  const ganttStart = 7 * 60;
  const totalMins = 14 * 60;

  if (availabilityLoading) {
    return (
      <div className="space-y-6" data-tour="surgery-scheduler">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-heading-sm font-semibold text-obsidian">{t('surgery.scheduler.title')}</h1>
            <p className="text-body text-slate mt-1">{t('surgery.scheduler.subtitle')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-lg bg-slate/5 animate-pulse" />
          <div className="h-96 rounded-lg bg-slate/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (availabilityError) {
    return (
      <div className="space-y-6" data-tour="surgery-scheduler">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-heading-sm font-semibold text-obsidian">{t('surgery.scheduler.title')}</h1>
            <p className="text-body text-slate mt-1">{t('surgery.scheduler.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-body text-red-500">{availabilityErr?.message || t('common.error')}</p>
          <button onClick={() => refetchAvailability()} className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90">
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-tour="surgery-scheduler">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('surgery.scheduler.title')}</h1>
          <p className="text-body text-slate mt-1">{t('surgery.scheduler.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="sched-date" className="text-sm font-medium text-graphite">{t('surgery.scheduler.date')}</label>
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
            <CardTitle>{t('surgery.scheduler.orAvailability', { date })}</CardTitle>
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
                        <span className="text-body font-medium text-obsidian">{t('surgery.or')} {room}</span>
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
            <CardTitle>{t('surgery.scheduler.newSurgery')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.patient')}</label>
              {selectedPatient ? (
                <div className="flex items-center justify-between px-3 py-2 bg-lilac-bloom/10 border border-lilac-bloom rounded-lg">
                  <span className="text-body font-medium text-obsidian">{selectedPatient.fullName} ({selectedPatient.mrn})</span>
                  <button type="button" onClick={() => selectPatient(null)} className="text-caption text-slate hover:text-obsidian" aria-label={t('common.cancel')}>&times;</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('surgery.scheduler.searchPatient')}
                    />
                  </div>
                  {searching && (
                    <div className="mt-2 text-caption text-slate flex items-center gap-2" role="status">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      {t('common.loading')}
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-silver rounded-lg divide-y divide-silver max-h-40 overflow-y-auto">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-body hover:bg-bone transition-colors"
                          onClick={() => selectPatient(p)}
                        >
                          <span className="font-medium text-obsidian">{p.fullName}</span>
                          <span className="text-caption text-slate ml-2">{p.mrn}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.department')}</label>
              <select
                value={departmentId}
                onChange={(e) => { setDepartmentId(e.target.value); setOperationTypeId(''); }}
                onFocus={fetchDepartments}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              >
                <option value="">{loadingDepts ? t('common.loading') : t('surgery.scheduler.selectDepartment')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {departmentId && (
              <div>
                <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.operationType')}</label>
                <select
                  value={operationTypeId}
                  onChange={(e) => setOperationTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                >
                  <option value="">{t('surgery.scheduler.selectOpType')}</option>
                  {operationTypes.map((ot) => (
                    <option key={ot.id} value={ot.id}>{ot.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.anesthesiaType')}</label>
              <input
                type="text"
                value={anesthesiaType}
                onChange={(e) => setAnesthesiaType(e.target.value)}
                placeholder={t('surgery.scheduler.anesthesiaPlaceholder')}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.orRoom')}</label>
              <select
                value={orRoom}
                onChange={(e) => setOrRoom(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              >
                <option value="">{t('surgery.scheduler.selectOR')}</option>
                {OR_ROOMS.map((r) => (
                  <option key={r} value={r}>{t('surgery.or')} {r}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.start')}</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.end')}</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.postOpDisposition')}</label>
              <div className="flex gap-2">
                {['PENDING', 'DISCHARGE_HOME', 'ADMIT_WARD'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${disposition === d ? 'bg-lilac-bloom text-paper border-lilac-bloom' : 'bg-paper text-graphite border-silver hover:border-lilac-bloom/50'}`}
                    onClick={() => setDisposition(d)}
                  >
                    {d === 'PENDING' ? t('surgery.scheduler.toDecide') : d === 'DISCHARGE_HOME' ? t('surgery.scheduler.home') : t('surgery.scheduler.admit')}
                  </button>
                ))}
              </div>
            </div>

            {disposition === 'ADMIT_WARD' && (
              <div>
                <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.ward')}</label>
                <select
                  value={admittedWardId}
                  onChange={(e) => setAdmittedWardId(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                >
                  <option value="">{t('surgery.scheduler.selectWard')}</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.scheduler.notesOptional')}</label>
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
              disabled={!selectedPatient || !departmentId || !orRoom}
            >
              {t('surgery.scheduler.scheduleSurgery')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
