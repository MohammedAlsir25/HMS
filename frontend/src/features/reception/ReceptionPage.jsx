import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';
import NewPatientForm from './NewPatientForm';
import ReservationsPanel from './ReservationsPanel';
import FileUploader from './FileUploader';

const TABS = ['newPatient', 'reservations', 'queue'];

const clinicList = [
  { id: 'placeholder', name: 'Select clinic...', slug: '' },
  { id: 'medicine', name: 'Medicine', slug: 'medicine' },
  { id: 'ent', name: 'ENT', slug: 'ent' },
  { id: 'dental', name: 'Dental', slug: 'dental' },
  { id: 'retina', name: 'Retina', slug: 'retina' },
  { id: 'glaucoma', name: 'Glaucoma', slug: 'glaucoma' },
  { id: 'orbit', name: 'Orbit', slug: 'orbit' },
  { id: 'pediatrics-ophth', name: 'Peds Ophth', slug: 'pediatrics-ophth' },
  { id: 'general-ophth', name: 'Gen Ophth', slug: 'general-ophth' },
  { id: 'optometry', name: 'Optometry', slug: 'optometry' },
];

const statusConfig = {
  WAITING: { label: 'Waiting', variant: 'warning' },
  CALLED: { label: 'Called', variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'primary' },
  COMPLETED: { variant: 'success' },
  CANCELLED: { variant: 'danger' },
  NO_SHOW: { variant: 'danger' },
};

const clinics = clinicList.filter((c) => c.slug);

function calcAge(dob) {
  if (!dob) return null;
  const diff = new Date() - new Date(dob);
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default function ReceptionPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [appointmentType, setAppointmentType] = useState('WALKIN');
  const [queue, setQueue] = useState([]);
  const [queueStats, setQueueStats] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [queueClinicFilter, setQueueClinicFilter] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [callingNext, setCallingNext] = useState(false);
  const queueRef = useRef(null);
  queueRef.current = queue;

  const loadQueue = useCallback(async (clinicId) => {
    if (!clinicId) return;
    setQueueLoading(true);
    try {
      const data = await api.get(`/reception/queue/${clinicId}`);
      setQueue(data);
    } catch { /* ignore */ }
    finally { setQueueLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get('/reception/queue/stats');
      setQueueStats(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const targetClinic = queueClinicFilter || selectedClinic;
    loadStats();
    if (targetClinic) loadQueue(targetClinic);
    const interval = setInterval(() => {
      const clinic = queueRef.current?.[0]?.clinicId || queueClinicFilter || selectedClinic;
      if (clinic) loadQueue(clinic);
      loadStats();
    }, 8000);
    return () => clearInterval(interval);
  }, [queueClinicFilter, selectedClinic, loadQueue, loadStats]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      api.get(`/reception/search?q=${encodeURIComponent(searchQuery)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCheckIn = useCallback(async () => {
    if (!selectedPatient || !selectedClinic) return;
    try {
      const appt = await api.post('/reception/check-in', {
        patientId: selectedPatient.id,
        clinicId: selectedClinic,
        type: appointmentType,
      });
      setQueue((prev) => [...prev, appt]);
      setSelectedPatient(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch { /* ignore */ }
  }, [selectedPatient, selectedClinic, appointmentType]);

  const handleStatusChange = useCallback(async (id, status) => {
    try {
      const updated = await api.patch(`/reception/appointments/${id}/status`, { status });
      setQueue((prev) => prev.map((a) => (a.id === id ? { ...updated, estimatedWaitMins: a.estimatedWaitMins, position: a.position } : a)));
    } catch { /* ignore */ }
  }, []);

  const handlePriority = useCallback(async (id, priority) => {
    try {
      const updated = await api.patch(`/reception/appointments/${id}/priority`, { priority });
      setQueue((prev) => prev.map((a) => (a.id === id ? { ...updated, estimatedWaitMins: a.estimatedWaitMins, position: a.position } : a)));
    } catch { /* ignore */ }
  }, []);

  const handleCallNext = useCallback(async () => {
    const clinicId = queueClinicFilter || queue[0]?.clinicId;
    if (!clinicId) return;
    setCallingNext(true);
    try {
      const updated = await api.post(`/reception/queue/${clinicId}/call-next`);
      setQueue((prev) => prev.map((a) => (a.id === updated.id ? { ...updated, estimatedWaitMins: a.estimatedWaitMins, position: a.position } : a)));
    } catch { /* ignore */ }
    finally { setCallingNext(false); }
  }, [queueClinicFilter, queue]);

  const handlePatientCreated = useCallback((patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const waiting = queue.filter((a) => a.status === 'WAITING');
  const called = queue.filter((a) => a.status === 'CALLED');
  const inProgress = queue.filter((a) => a.status === 'IN_PROGRESS');

  const filteredWaiting = queueSearch
    ? waiting.filter((a) => a.patient.fullName.toLowerCase().includes(queueSearch.toLowerCase()) || a.patient.mrn.toLowerCase().includes(queueSearch.toLowerCase()))
    : waiting;

  const activeClinic = queueClinicFilter || selectedClinic;
  const activeStats = queueStats.find((s) => s.id === activeClinic);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('reception.title')}</h1>
          <p className="text-body text-slate mt-1">{t('reception.description')}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2">
        {TABS.map((k) => (
          <Button key={k} variant={tab === k ? 'primary' : 'secondary'} onClick={() => setTab(k)} size="sm">
            {t(`reception.${k}`)}
          </Button>
        ))}
      </div>

      {tab === 'newPatient' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 space-y-3">
              <Input
                label={t('reception.search')}
                placeholder={t('reception.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searching && <p className="text-caption text-slate">{t('reception.searching')}</p>}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 border border-silver rounded-lg">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      className={`w-full text-left px-3 py-2 text-body rounded-lg transition-colors touch-target
                        ${selectedPatient?.id === p.id ? 'bg-lilac-bloom text-obsidian' : 'hover:bg-bone text-graphite'}`}
                      onClick={() => { setSelectedPatient(p); setSearchQuery(''); setSearchResults([]); }}
                    >
                      <span className="font-medium">{p.fullName}</span>
                      <span className="text-caption text-slate ml-2">{p.mrn}</span>
                      {p.phone && <span className="text-caption text-slate ml-2">{p.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <p className="text-caption text-slate text-center">{t('reception.noPatientFound')}</p>
              )}
            </Card>

            {selectedPatient && (
              <Card className="p-4 space-y-3">
                <div>
                  <p className="text-body font-medium text-obsidian">{selectedPatient.fullName}</p>
                  <p className="text-caption text-slate">{selectedPatient.mrn}</p>
                  {selectedPatient.phone && <p className="text-caption text-slate">{selectedPatient.phone}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">{t('reception.appointmentType')}</label>
                  <div className="flex gap-2">
                    <button
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
                        ${appointmentType === 'WALKIN' ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                      onClick={() => setAppointmentType('WALKIN')}
                    >
                      {t('reception.walkin')}
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
                        ${appointmentType === 'RESERVATION' ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                      onClick={() => setAppointmentType('RESERVATION')}
                    >
                      {t('reception.reservation')}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">{t('reception.clinic')}</label>
                  <select
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian
                      focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent"
                    value={selectedClinic}
                    onChange={(e) => setSelectedClinic(e.target.value)}
                  >
                    {clinicList.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Button className="w-full" disabled={!selectedClinic} onClick={handleCheckIn}>
                  {t('reception.checkIn')} — {appointmentType === 'WALKIN' ? t('reception.walkin') : t('reception.reservation')}
                </Button>
              </Card>
            )}

            <NewPatientForm clinics={clinics} onPatientCreated={handlePatientCreated} />
          </div>

          <div className="lg:col-span-2">
            {selectedPatient && <FileUploader patientId={selectedPatient.id} patientName={selectedPatient.fullName} />}
            {selectedPatient && (
              <div className="mt-4">
                <Card className="p-4">
                  <p className="text-sm text-graphite">{t('reception.fileUploadHint')}</p>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'reservations' && <ReservationsPanel clinics={clinics} />}

      {tab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <div className="p-4 border-b border-silver flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <h2 className="text-subheading font-semibold text-obsidian">{t('reception.queue')}</h2>
                  <select
                    className="px-3 py-1.5 bg-paper border border-silver rounded-lg text-caption text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                    value={queueClinicFilter}
                    onChange={(e) => setQueueClinicFilter(e.target.value)}
                  >
                    <option value="">{t('reception.selectClinic')}</option>
                    {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Filter patients..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-48"
                  />
                  <Button variant="primary" size="sm" onClick={handleCallNext} disabled={callingNext || waiting.length === 0}>
                    {callingNext ? '...' : 'Call Next'}
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {!queueClinicFilter && !queue[0]?.clinicId ? (
                  <p className="text-body text-slate text-center py-8">{t('reception.selectClinic')}</p>
                ) : queueLoading ? (
                  <p className="text-caption text-slate">{t('common.loading')}</p>
                ) : queue.length === 0 ? (
                  <p className="text-body text-slate text-center py-8">{t('reception.emptyQueue')}</p>
                ) : (
                  <div className="space-y-4">
                    {inProgress.length > 0 && (
                      <div>
                        <p className="text-caption font-medium text-green-600 uppercase tracking-wide mb-2">In Progress</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {inProgress.map((a) => (
                            <QueueCard key={a.id} appt={a} onStatusChange={handleStatusChange} onPriority={handlePriority} t={t} />
                          ))}
                        </div>
                      </div>
                    )}
                    {called.length > 0 && (
                      <div>
                        <p className="text-caption font-medium text-sky-600 uppercase tracking-wide mb-2">Called</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {called.map((a) => (
                            <QueueCard key={a.id} appt={a} onStatusChange={handleStatusChange} onPriority={handlePriority} t={t} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-caption font-medium text-amber-600 uppercase tracking-wide">Waiting ({filteredWaiting.length})</p>
                        {activeStats && <p className="text-caption text-slate">Est. wait: ~{filteredWaiting.length * 10} min total</p>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredWaiting.map((a) => (
                          <QueueCard key={a.id} appt={a} onStatusChange={handleStatusChange} onPriority={handlePriority} t={t} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <div className="p-4 border-b border-silver">
                <h3 className="text-subheading font-semibold text-obsidian">Clinic Overview</h3>
              </div>
              <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
                {queueStats.length === 0 && <p className="text-caption text-slate">No data</p>}
                {queueStats.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${s.id === activeClinic ? 'border-lilac-bloom bg-lilac-bloom/5' : 'border-silver'}`}>
                    <div>
                      <p className="text-sm font-medium text-obsidian">{s.name}</p>
                      <p className="text-xs text-slate">{s.waiting} waiting &middot; {s.inProgress} active</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-obsidian">{s.waiting}</p>
                      <p className="text-xs text-slate">{s.waiting * 10}m</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueCard({ appt, onStatusChange, onPriority, t }) {
  const patient = appt.patient || {};
  const age = calcAge(patient.dateOfBirth);
  const isPriority = appt.priority > 0;
  const isReservation = appt.type === 'RESERVATION';
  const status = statusConfig[appt.status] || {};

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      appt.status === 'IN_PROGRESS' ? 'border-green-300 bg-green-50/50' :
      appt.status === 'CALLED' ? 'border-sky-300 bg-sky-50/50' :
      isPriority ? 'border-amber-300 bg-amber-50/50' :
      'border-silver bg-paper hover:border-lilac-bloom/30'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${
            appt.status === 'IN_PROGRESS' ? 'text-green-600' :
            appt.status === 'CALLED' ? 'text-sky-600' :
            'text-obsidian'
          }`}>
            #{String(appt.token).padStart(3, '0')}
          </span>
          <Badge variant={status.variant || 'default'} size="sm">{status.label || appt.status}</Badge>
          {isReservation && <Badge variant="info" size="sm">Resv</Badge>}
          {isPriority && <Badge variant="warning" size="sm">P{appt.priority}</Badge>}
        </div>
        {appt.estimatedWaitMins > 0 && appt.status === 'WAITING' && (
          <span className="text-xs font-medium text-amber-600 whitespace-nowrap">~{appt.estimatedWaitMins} min</span>
        )}
      </div>

      <div className="mb-3">
        <p className="text-body font-medium text-obsidian">{patient.fullName}</p>
        <div className="flex items-center gap-2 text-caption text-slate">
          <span>{patient.mrn}</span>
          {age !== null && <span>&middot; {age}y</span>}
          {patient.phone && <span>&middot; {patient.phone}</span>}
        </div>
        {patient.notes && <p className="text-xs text-amber-700 mt-1 italic">{patient.notes}</p>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {appt.status === 'WAITING' && (
            <Button size="sm" onClick={() => onStatusChange(appt.id, 'CALLED')}>Call</Button>
          )}
          {appt.status === 'CALLED' && (
            <Button size="sm" onClick={() => onStatusChange(appt.id, 'IN_PROGRESS')}>Start</Button>
          )}
          {appt.status === 'IN_PROGRESS' && (
            <Button size="sm" onClick={() => onStatusChange(appt.id, 'COMPLETED')}>Done</Button>
          )}
          {(appt.status === 'WAITING' || appt.status === 'CALLED') && (
            <Button size="sm" variant="secondary" onClick={() => onStatusChange(appt.id, 'CANCELLED')}>Cancel</Button>
          )}
          {appt.status === 'WAITING' && (
            <Button size="sm" variant="secondary" onClick={() => onStatusChange(appt.id, 'NO_SHOW')}>No-Show</Button>
          )}
        </div>
        <select
          className="px-2 py-1 bg-paper border border-silver rounded text-caption"
          value={appt.priority}
          onChange={(e) => onPriority(appt.id, parseInt(e.target.value))}
          title="Priority"
        >
          {[0, 1, 2, 3, 4, 5].map((p) => (
            <option key={p} value={p}>{p === 0 ? 'Normal' : `P${p}`}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
