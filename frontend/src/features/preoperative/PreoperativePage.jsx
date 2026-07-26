import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  usePreoperativePatients,
  useUpdatePreopStatus,
  useConfirmPreopRequest,
  useRecordPreopPayment,
  useMarkLabDone,
  useMarkImagingDone,
  useCancelPreopRequest,
} from '../../hooks/queries/usePreoperative';
import { useSurgeries } from '../../hooks/queries/useSurgery';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import PreopRequestForm from './PreopRequestForm';
import ConsentWaiverModal from './ConsentWaiverModal';
import ScheduleSurgeryModal from './ScheduleSurgeryModal';
import toast from 'react-hot-toast';

const statusColors = {
  WAITING: { label: 'Waiting', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  CLEARED: { label: 'Cleared', variant: 'success' },
  FLAGGED: { label: 'Flagged', variant: 'danger' },
};

const workflowStatuses = ['REQUESTED', 'CONFIRMED', 'PAYMENT_DONE', 'INVESTIGATIONS_DONE', 'SCHEDULED', 'WAITING', 'IN_PROGRESS', 'CLEARED', 'FLAGGED', 'CANCELLED'];

const workflowLabels = {
  REQUESTED: { label: 'Requested', variant: 'default' },
  CONFIRMED: { label: 'Confirmed', variant: 'primary' },
  PAYMENT_DONE: { label: 'Paid', variant: 'success' },
  INVESTIGATIONS_DONE: { label: 'Labs Done', variant: 'info' },
  SCHEDULED: { label: 'Scheduled', variant: 'primary' },
  WAITING: { label: 'Waiting', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  CLEARED: { label: 'Cleared', variant: 'success' },
  FLAGGED: { label: 'Flagged', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

export default function PreoperativePage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [flagModal, setFlagModal] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [referTo, setReferTo] = useState('');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [waiverModal, setWaiverModal] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [activeTab, setActiveTab] = useState('board');

  const { data: patients = [], isLoading, isError, refetch } = usePreoperativePatients();
  const { data: surgeries = [] } = useSurgeries(date);
  const updateStatus = useUpdatePreopStatus();
  const confirmRequest = useConfirmPreopRequest();
  const recordPayment = useRecordPreopPayment();
  const markLabDone = useMarkLabDone();
  const markImagingDone = useMarkImagingDone();
  const cancelRequest = useCancelPreopRequest();

  const surgeryMap = {};
  surgeries.forEach((s) => { surgeryMap[s.preoperativeId] = s; });

  const groups = { WAITING: [], IN_PROGRESS: [], CLEARED: [], FLAGGED: [] };
  patients.forEach((p) => {
    if (groups[p.status]) groups[p.status].push(p);
    else groups.WAITING.push(p);
  });

  const handleAdvance = (id, status) => {
    if (status === 'FLAGGED') {
      setFlagModal(id);
      return;
    }
    updateStatus.mutate({ id, status });
  };

  const handleFlagConfirm = () => {
    if (!flagModal) return;
    updateStatus.mutate({
      id: flagModal,
      status: 'FLAGGED',
      flaggedReason: flagReason,
      referredTo: referTo || undefined,
    });
    setFlagModal(null);
    setFlagReason('');
    setReferTo('');
  };

  const handleConfirm = (id) => {
    confirmRequest.mutate(id, {
      onError: (err) => toast.error(err.message || 'Failed to confirm'),
    });
  };

  const handleRecordPayment = (id) => {
    recordPayment.mutate(id, {
      onSuccess: () => toast.success('Payment recorded'),
      onError: (err) => toast.error(err.message || 'Failed to record payment'),
    });
  };

  const handleMarkLabDone = (id) => {
    markLabDone.mutate({ id }, {
      onSuccess: () => toast.success('Lab results recorded'),
      onError: (err) => toast.error(err.message || 'Failed to mark lab done'),
    });
  };

  const handleMarkImagingDone = (id) => {
    markImagingDone.mutate({ id }, {
      onSuccess: () => toast.success('Imaging results recorded'),
      onError: (err) => toast.error(err.message || 'Failed to mark imaging done'),
    });
  };

  const handleCancelConfirm = () => {
    if (!cancelModal || !cancelReason.trim()) return;
    cancelRequest.mutate({ id: cancelModal, cancelledReason: cancelReason.trim() }, {
      onSuccess: () => { setCancelModal(null); setCancelReason(''); toast.success('Request cancelled'); },
      onError: (err) => toast.error(err.message || 'Failed to cancel'),
    });
  };

  const statusOrder = ['IN_PROGRESS', 'WAITING', 'CLEARED', 'FLAGGED'];
  const boardSections = statusOrder.filter((k) => groups[k].length > 0);

  return (
    <div className="space-y-6" data-tour="preoperative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('preoperative.title')}</h1>
          <p className="text-body text-slate mt-1">{t('preoperative.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowNewRequest(true)}>{t('preoperative.newRequest')}</Button>
          <label htmlFor="preop-date" className="text-sm font-medium text-graphite">{t('preoperative.surgeryDate')}</label>
          <input
            id="preop-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          />
        </div>
      </div>

      <div className="flex gap-2" role="tablist">
        {['board', 'requests'].map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-lilac-bloom text-obsidian'
                : 'bg-bone text-graphite hover:text-obsidian'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'board' ? t('preoperative.tabBoard') : t('preoperative.tabRequests')}
          </button>
        ))}
      </div>

      {activeTab === 'board' && (
        <>
          {isError && (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <p className="text-body text-red-500">Failed to load preoperative data</p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                  >
                    Retry
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isError && boardSections.length === 0 && !isLoading && (
            <Card>
              <CardContent>
                <p className="text-body text-slate text-center py-8">{t('preoperative.noPatients')}</p>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((col) => (
                    <div key={col} className="space-y-3">
                      <div className="h-6 w-24 bg-bone rounded animate-pulse" />
                      {[1, 2].map((item) => (
                        <div key={item} className="h-28 bg-bone rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {statusOrder.map((statusKey) => {
              const list = groups[statusKey] || [];
              if (list.length === 0) return null;
              const colors = statusColors[statusKey] || statusColors.WAITING;
              return (
                <Card key={statusKey} className="h-fit">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        <span className={`inline-flex items-center gap-2`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            statusKey === 'IN_PROGRESS' ? 'bg-blue-400' :
                            statusKey === 'WAITING' ? 'bg-amber-400' :
                            statusKey === 'CLEARED' ? 'bg-green-400' :
                            'bg-red-400'
                          }`} />
                           {statusKey === 'IN_PROGRESS' ? t('preoperative.statusInProgress') :
                           statusKey === 'WAITING' ? t('preoperative.statusWaiting') :
                           statusKey === 'CLEARED' ? t('preoperative.statusCleared') :
                           t('preoperative.statusFlagged')}
                        </span>
                      </CardTitle>
                      <Badge variant={colors.variant} size="sm">{list.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[65vh] overflow-y-auto">
                    {list.map((p) => {
                      const surgery = surgeryMap[p.id];
                      const age = p.patient?.dateOfBirth
                        ? Math.floor((new Date() - new Date(p.patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                        : null;
                      return (
                        <div key={p.id} className="rounded-xl border border-silver p-4 space-y-3 hover:border-lilac-bloom/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-body font-medium text-obsidian">{p.patient?.fullName || 'Unknown'}</p>
                              <p className="text-caption text-slate">
                                {p.patient?.mrn}
                                {age !== null && <span> &middot; {age}y</span>}
                              </p>
                            </div>
                            <Badge variant={colors.variant} size="sm">{statusKey.replace('_', ' ')}</Badge>
                          </div>

                          <div className="text-caption text-slate space-y-1">
                            {p.operationType && (
                              <p><span className="font-medium text-graphite">Op:</span> {p.operationType.name}</p>
                            )}
                            {surgery && (
                              <p><span className="font-medium text-graphite">Scheduled:</span> {new Date(surgery.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            )}
                            {p.anesthesiologist && (
                              <p><span className="font-medium text-graphite">Anesth:</span> {p.anesthesiologist.fullName}</p>
                            )}
                            {p.flaggedReason && (
                              <p className="text-red-600 dark:text-red-400"><span className="font-medium">Flag:</span> {p.flaggedReason}</p>
                            )}
                            {p.referredTo && (
                              <p className="text-amber-600 dark:text-amber-400"><span className="font-medium">Referred:</span> {p.referredTo}</p>
                            )}
                            {p.notes && <p className="italic">{p.notes}</p>}
                          </div>

                          <div className="flex gap-2 pt-1">
                            {statusKey === 'WAITING' && (
                              <Button size="sm" onClick={() => handleAdvance(p.id, 'IN_PROGRESS')}>{t('preoperative.start')}</Button>
                            )}
                            {statusKey === 'IN_PROGRESS' && (
                              <>
                                <Button size="sm" onClick={() => handleAdvance(p.id, 'CLEARED')}>{t('preoperative.clear')}</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleAdvance(p.id, 'FLAGGED')}>{t('preoperative.flag')}</Button>
                              </>
                            )}
                            {statusKey === 'FLAGGED' && (
                              <Button size="sm" onClick={() => handleAdvance(p.id, 'IN_PROGRESS')}>{t('preoperative.reEvaluate')}</Button>
                            )}
                            {(statusKey === 'WAITING' || statusKey === 'IN_PROGRESS') && (
                              <Button size="sm" variant="ghost" onClick={() => handleAdvance(p.id, 'FLAGGED')}>{t('preoperative.skip')}</Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('preoperative.allRequests')}</CardTitle>
              <span className="text-caption text-slate">{patients.length} {t('preoperative.requestsCount')}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
            {isError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-body text-red-500">Failed to load preoperative data</p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                >
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-bone rounded-lg animate-pulse" />
                ))}
              </div>
            ) : patients.length === 0 ? (
              <p className="text-body text-slate text-center py-8">{t('preoperative.noPatients')}</p>
            ) : (
              patients.map((p) => {
                const wfLabel = workflowLabels[p.status] || workflowLabels.REQUESTED;
                const age = p.patient?.dateOfBirth
                  ? Math.floor((new Date() - new Date(p.patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                  : null;
                return (
                  <div key={p.id} className="rounded-xl border border-silver p-4 space-y-3 hover:border-lilac-bloom/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-body font-medium text-obsidian">{p.patient?.fullName || 'Unknown'}</p>
                        <p className="text-caption text-slate">
                          {p.patient?.mrn}
                          {age !== null && <span> &middot; {age}y</span>}
                          {p.department && <span> &middot; {p.department.name}</span>}
                        </p>
                      </div>
                      <Badge variant={wfLabel.variant} size="sm">{wfLabel.label}</Badge>
                    </div>

                    <div className="text-caption text-slate space-y-1">
                      {p.operationType && (
                        <p><span className="font-medium text-graphite">Op:</span> {p.operationType.name}</p>
                      )}
                      {p.notes && <p className="italic">{p.notes}</p>}
                      {p.waiver && (
                        <p className="text-green-600"><span className="font-medium">Waiver:</span> Signed by {p.waiver.signedBy}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {p.status === 'REQUESTED' && (
                        <>
                          <Button size="sm" onClick={() => handleConfirm(p.id)} loading={confirmRequest.isPending}>{t('preoperative.confirm')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setWaiverModal(p.id)}>{t('preoperative.consentWaiver')}</Button>
                          <Button size="sm" variant="danger" onClick={() => { setCancelModal(p.id); setCancelReason(''); }}>{t('preoperative.cancel')}</Button>
                        </>
                      )}
                      {p.status === 'CONFIRMED' && (
                        <>
                          <Button size="sm" onClick={() => handleRecordPayment(p.id)} loading={recordPayment.isPending}>{t('preoperative.recordPayment')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setWaiverModal(p.id)}>{t('preoperative.consentWaiver')}</Button>
                        </>
                      )}
                      {p.status === 'PAYMENT_DONE' && (
                        <>
                          <Button size="sm" onClick={() => handleMarkLabDone(p.id)} loading={markLabDone.isPending}>{t('preoperative.labDone')}</Button>
                          <Button size="sm" variant="secondary" onClick={() => handleMarkImagingDone(p.id)} loading={markImagingDone.isPending}>{t('preoperative.imagingDone')}</Button>
                        </>
                      )}
                      {p.status === 'INVESTIGATIONS_DONE' && (
                        <Button size="sm" onClick={() => setScheduleModal({ id: p.id, name: p.patient?.fullName })}>{t('preoperative.scheduleSurgery')}</Button>
                      )}
                      {p.status === 'CLEARED' && (
                        <Button size="sm" onClick={() => setScheduleModal({ id: p.id, name: p.patient?.fullName })}>{t('preoperative.scheduleSurgery')}</Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={!!flagModal} onClose={() => setFlagModal(null)} title={t('preoperative.flagPatient')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('preoperative.flagReason')}</label>
            <textarea
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder={t('preoperative.flagPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('preoperative.referTo')}</label>
            <input
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              value={referTo}
              onChange={(e) => setReferTo(e.target.value)}
              placeholder={t('preoperative.referPlaceholder')}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setFlagModal(null)}>{t('wards.cancel')}</Button>
            <Button variant="danger" onClick={handleFlagConfirm} disabled={!flagReason.trim()}>{t('preoperative.confirmFlag')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title={t('preoperative.cancelRequest')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('preoperative.cancelReason')}</label>
            <textarea
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('preoperative.cancelPlaceholder')}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setCancelModal(null)}>{t('preoperative.close')}</Button>
            <Button variant="danger" onClick={handleCancelConfirm} loading={cancelRequest.isPending} disabled={!cancelReason.trim()}>{t('preoperative.confirmCancel')}</Button>
          </div>
        </div>
      </Modal>

      <PreopRequestForm open={showNewRequest} onClose={() => setShowNewRequest(false)} />

      {waiverModal && (
        <ConsentWaiverModal
          open={!!waiverModal}
          onClose={() => setWaiverModal(null)}
          requestId={waiverModal}
        />
      )}

      {scheduleModal && (
        <ScheduleSurgeryModal
          open={!!scheduleModal}
          onClose={() => setScheduleModal(null)}
          requestId={scheduleModal.id}
          patientName={scheduleModal.name}
        />
      )}
    </div>
  );
}
