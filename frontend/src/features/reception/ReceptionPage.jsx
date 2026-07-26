import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useClinics } from '../../hooks/queries/useClinics';
import { useReceptionQueue, useReceptionQueueStats, useCheckIn, useUpdateAppointmentStatus, useUpdateAppointmentPriority, useCallNext } from '../../hooks/queries/useReception';
import { patientKeys } from '../../hooks/usePatients';
import { useDebounce } from '../../hooks/useDebounce';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { notifyError, notifySuccess } from '../../utils/notify';
import { Badge } from '../../components/ui/Badge';
import { CURRENCY } from '../../utils/currency';
import { printReceipt } from '../../lib/printReceipt';
import { useCurrentShift, useCreateCashMovement } from '../../hooks/queries/useAccounting';
import ReservationsPanel from './ReservationsPanel';
import FileUploader from './FileUploader';
import FollowUpsPanel from './FollowUpsPanel';
import ReceptionLabPayments from './ReceptionLabPayments';
import QueueBoard from './QueueBoard';

const TABS = ['checkin', 'reservations', 'queue', 'board', 'followUps', 'labPayments'];

const statusConfig = {
  WAITING: { label: 'Waiting', variant: 'warning' },
  CALLED: { label: 'Called', variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'primary' },
  COMPLETED: { variant: 'success' },
  CANCELLED: { variant: 'danger' },
  NO_SHOW: { variant: 'danger' },
};

function calcAge(dob) {
  if (!dob) return null;
  const diff = new Date() - new Date(dob);
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default function ReceptionPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [appointmentType, setAppointmentType] = useState('WALKIN');
  const [collectPayment, setCollectPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [queueClinicFilter, setQueueClinicFilter] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [optometryRoutingMsg, setOptometryRoutingMsg] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupAmount, setPickupAmount] = useState('');
  const [pickupReason, setPickupReason] = useState('');

  const { data: shiftData } = useCurrentShift();
  const createMovement = useCreateCashMovement();
  const openShift = shiftData?.id && !shiftData.closedAt ? shiftData : null;

  const handleRecordPickup = async () => {
    if (!pickupAmount || !openShift) return;
    try {
      await createMovement.mutateAsync({ shiftId: openShift.id, type: 'PICKUP', amount: parseFloat(pickupAmount), reason: pickupReason || null });
      notifySuccess('Pickup recorded');
      setShowPickupModal(false);
      setPickupAmount('');
      setPickupReason('');
    } catch (err) { notifyError(err); }
  };

  const { data: clinics = [] } = useClinics();
  const activeClinic = queueClinicFilter || selectedClinic;
  const { data: queue = [], isLoading: queueLoading, isError: queueError, refetch: refetchQueue } = useReceptionQueue(activeClinic);
  const { data: queueStats = [] } = useReceptionQueueStats();
  const checkIn = useCheckIn();
  const updateStatus = useUpdateAppointmentStatus();
  const updatePriority = useUpdateAppointmentPriority();
  const callNext = useCallNext();

  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: patientKeys.search(debouncedQuery),
    queryFn: () => api.get(`/patients/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
  });

  const handleCheckIn = async () => {
    if (!selectedPatient || !selectedClinic) return;
    try {
      const result = await checkIn.mutateAsync({
        patientId: selectedPatient.id,
        clinicId: selectedClinic,
        type: appointmentType,
        collectPayment: collectPayment || undefined,
        paymentMethod: collectPayment ? paymentMethod : undefined,
      });
      if (result.transaction) {
        const clinic = clinics.find((c) => c.id === selectedClinic);
        setLastReceipt({
          transaction: result.transaction,
          patientName: selectedPatient.fullName,
          mrn: selectedPatient.mrn,
          clinicName: clinic?.name || '',
        });
      }
      if (result.optometryRouting) {
        setOptometryRoutingMsg(`Patient ${selectedPatient.fullName} routed to Optometry for pre-screening before ${result.targetClinic.name} (Token #${String(result.appointment.token).padStart(3, '0')})`);
      }
      setSelectedPatient(null);
      setCollectPayment(false);
      setPaymentMethod('CASH');
      setSearchQuery('');
    } catch (err) { notifyError(err); }
  };

  const handleStatusChange = (id, status) => {
    updateStatus.mutate({ id, status });
  };

  const handlePriority = (id, priority) => {
    updatePriority.mutate({ id, priority });
  };

  const handleCallNext = () => {
    callNext.mutate(activeClinic);
  };

  const waiting = queue.filter((a) => a.status === 'WAITING');
  const called = queue.filter((a) => a.status === 'CALLED');
  const inProgress = queue.filter((a) => a.status === 'IN_PROGRESS');

  const filteredWaiting = queueSearch
    ? waiting.filter((a) => a.patient.fullName.toLowerCase().includes(queueSearch.toLowerCase()) || a.patient.mrn.toLowerCase().includes(queueSearch.toLowerCase()))
    : waiting;

  const activeStats = queueStats.find((s) => s.id === activeClinic);

  return (
      <div className="space-y-6" data-tour="reception">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('reception.title')}</h1>
          <p className="text-body text-slate mt-1">{t('reception.description')}</p>
        </div>
      </div>

      {openShift && (
        <div className="flex items-center justify-between bg-bone border border-silver rounded-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <Badge variant="success">{t('reception.shiftActive')}</Badge>
            <span className="text-caption text-graphite">{t('reception.since')} {new Date(openShift.openedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-caption text-slate">{openShift.transactions?.length || 0} {t('reception.transactions')}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowPickupModal(true)}>{t('reception.recordPickup')}</Button>
        </div>
      )}

      {showPickupModal && (
        <Modal open={showPickupModal} onClose={() => setShowPickupModal(false)}>
          <div className="space-y-4 p-4">
            <h2 className="text-subheading font-semibold text-obsidian">{t('reception.recordCashPickup')}</h2>
            <Input label={t('reception.amountSDG')} type="number" step="0.01" min="0" value={pickupAmount} onChange={(e) => setPickupAmount(e.target.value)} />
            <Input label={t('reception.reason')} value={pickupReason} onChange={(e) => setPickupReason(e.target.value)} placeholder={t('reception.reasonPlaceholder')} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowPickupModal(false)}>{t('reception.cancel')}</Button>
              <Button onClick={handleRecordPickup} loading={createMovement.isPending} disabled={!pickupAmount}>{t('reception.recordPickup')}</Button>
            </div>
          </div>
        </Modal>
      )}

      {lastReceipt && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">{t('reception.paymentCollected', { amount: Number(lastReceipt.transaction.amount).toFixed(2) })}</p>
            <p className="text-caption text-green-600 dark:text-green-400">{lastReceipt.patientName} · {lastReceipt.clinicName}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="primary" size="sm" onClick={() => {
              printReceipt({
                title: 'Consultation Fee',
                transaction: lastReceipt.transaction,
                patientName: lastReceipt.patientName,
                mrn: lastReceipt.mrn,
                clinicName: lastReceipt.clinicName,
              });
            }}>{t('reception.printReceipt')}</Button>
            <Button variant="ghost" size="sm" onClick={() => setLastReceipt(null)}>&times;</Button>
          </div>
        </div>
      )}

      {optometryRoutingMsg && (
        <div className="bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{t('reception.optometryPreScreening')}</p>
            <p className="text-caption text-amber-600 dark:text-amber-400">{optometryRoutingMsg}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOptometryRoutingMsg(null)}>&times;</Button>
        </div>
      )}

      <div className="flex gap-2 border-b border-silver pb-2">
        {TABS.map((k) => (
          <Button key={k} variant={tab === k ? 'primary' : 'secondary'} onClick={() => setTab(k)} size="sm">
            {t(`reception.${k}`)}
          </Button>
        ))}
      </div>

      {tab === 'checkin' && (
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
                      onClick={() => { setSelectedPatient(p); setSearchQuery(''); }}
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
                      onChange={(e) => { setSelectedClinic(e.target.value); setOptometryRoutingMsg(null); }}
                    >
                      <option value="">{t('reception.selectClinic')}</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                </div>
                {(() => {
                  const c = clinics.find((x) => x.id === selectedClinic);
                  if (c?.optometryPreScreeningRequired) {
                    return (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          {t('reception.optometryPreScreeningDesc')}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  const c = clinics.find((x) => x.id === selectedClinic);
                  const fee = appointmentType === 'RESERVATION' ? null : (c?.consultationFee);
                  if (!fee || Number(fee) <= 0) return null;
                  return (
                    <div className="space-y-3 border border-silver rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="collectPaymentExisting" checked={collectPayment} onChange={(e) => setCollectPayment(e.target.checked)} className="rounded border-silver" />
                        <label htmlFor="collectPaymentExisting" className="text-sm text-graphite">{t('reception.collectPayment')}</label>
                      </div>
                      <p className="text-sm text-graphite">
                        {t('reception.consultationFee')}: <span className="font-semibold text-obsidian">{CURRENCY} {Number(fee).toFixed(2)}</span>
                      </p>
                      {collectPayment && (
                        <div>
                          <label className="block text-sm font-medium text-graphite mb-1">{t('reception.paymentMethod')}</label>
                          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                            <option value="CASH">{t('reception.cash')}</option>
                            <option value="CARD">{t('reception.card')}</option>
                            <option value="INSURANCE">{t('reception.insurance')}</option>
                            <option value="BANK_TRANSFER">{t('reception.bankTransfer')}</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })()}
          <Button className="w-full" disabled={!selectedClinic || checkIn.isPending} onClick={handleCheckIn} loading={checkIn.isPending}>
            {t('reception.checkIn')} — {appointmentType === 'WALKIN' ? t('reception.walkin') : t('reception.reservation')}
          </Button>
              </Card>
            )}

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

      {tab === 'followUps' && <FollowUpsPanel clinics={clinics} />}

      {tab === 'board' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              value={queueClinicFilter}
              onChange={(e) => setQueueClinicFilter(e.target.value)}
            >
              <option value="">{t('reception.selectClinicBoard')}</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <QueueBoard clinicId={queueClinicFilter} />
        </div>
      )}

      {tab === 'labPayments' && <ReceptionLabPayments />}

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
                    placeholder={t('reception.filterPatients')}
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-48"
                  />
                  <Button variant="primary" size="sm" onClick={handleCallNext} disabled={callNext.isPending || waiting.length === 0}>
                    {callNext.isPending ? '...' : t('reception.callNext')}
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {!queueClinicFilter && !queue[0]?.clinicId ? (
                  <p className="text-body text-slate text-center py-8">{t('reception.selectClinic')}</p>
                ) : queueLoading ? (
                  <p className="text-caption text-slate">{t('common.loading')}</p>
                ) : queueError ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <p className="text-body text-red-500">Failed to load queue</p>
                    <button
                      onClick={() => refetchQueue()}
                      className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                    >
                      Retry
                    </button>
                  </div>
                ) : queue.length === 0 ? (
                  <p className="text-body text-slate text-center py-8">{t('reception.emptyQueue')}</p>
                ) : (
                  <div className="space-y-4">
                    {inProgress.length > 0 && (
                      <div>
                        <p className="text-caption font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">{t('reception.inProgress')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {inProgress.map((a) => (
                            <QueueCard key={a.id} appt={a} onStatusChange={handleStatusChange} onPriority={handlePriority} t={t} />
                          ))}
                        </div>
                      </div>
                    )}
                    {called.length > 0 && (
                      <div>
                        <p className="text-caption font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wide mb-2">{t('reception.called')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {called.map((a) => (
                            <QueueCard key={a.id} appt={a} onStatusChange={handleStatusChange} onPriority={handlePriority} t={t} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-caption font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">{t('reception.waiting', { count: filteredWaiting.length })}</p>
                        {activeStats && <p className="text-caption text-slate">{t('reception.estWait', { minutes: filteredWaiting.length * 10 })}</p>}
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
                <h3 className="text-subheading font-semibold text-obsidian">{t('reception.clinicOverview')}</h3>
              </div>
              <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
                {queueStats.length === 0 && <p className="text-caption text-slate">{t('reception.noData')}</p>}
                {queueStats.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${s.id === activeClinic ? 'border-lilac-bloom bg-lilac-bloom/5' : 'border-silver'}`}>
                    <div>
                      <p className="text-sm font-medium text-obsidian">{s.name}</p>
                      <p className="text-xs text-slate">{s.waiting} {t('reception.queueWaiting')} &middot; {s.inProgress} {t('reception.queueActive')}</p>
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
      appt.status === 'IN_PROGRESS' ? 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/20' :
      appt.status === 'CALLED' ? 'border-sky-300 bg-sky-50/50 dark:border-sky-700 dark:bg-sky-900/20' :
      isPriority ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/20' :
      'border-silver bg-paper hover:border-lilac-bloom/30'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${
            appt.status === 'IN_PROGRESS' ? 'text-green-600 dark:text-green-400' :
            appt.status === 'CALLED' ? 'text-sky-600 dark:text-sky-400' :
            'text-obsidian'
          }`}>
            #{String(appt.token).padStart(3, '0')}
          </span>
          <Badge variant={status.variant || 'default'} size="sm">{status.label || appt.status}</Badge>
          {isReservation && <Badge variant="info" size="sm">Resv</Badge>}
          {isPriority && <Badge variant="warning" size="sm">P{appt.priority}</Badge>}
        </div>
        {appt.estimatedWaitMins > 0 && appt.status === 'WAITING' && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">~{appt.estimatedWaitMins} min</span>
        )}
      </div>

      <div className="mb-3">
        <p className="text-body font-medium text-obsidian">{patient.fullName}</p>
        <div className="flex items-center gap-2 text-caption text-slate">
          <span>{patient.mrn}</span>
          {age !== null && <span>&middot; {age}y</span>}
          {patient.phone && <span>&middot; {patient.phone}</span>}
        </div>
        {patient.notes && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 italic">{patient.notes}</p>}
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
