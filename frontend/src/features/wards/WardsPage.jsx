import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWards, useWardBeds, useCreateWard, useUpdateWard, useDeleteWard, useCreateBed, useAssignBed, useDischargeBed, useReserveBed, useSetBedMaintenance, useTransferBed, useWardRounds, useCreateWardRound } from '../../hooks/queries/useWards';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDepartments } from '../../hooks/queries/useAdmin';
import { usePatientSearch } from '../../hooks/usePatients';
import BedDetailPanel from './BedDetailPanel';

const bedStatusColors = {
  VACANT: '#22c55e',
  OCCUPIED: '#ef4444',
  RESERVED: '#eab308',
  MAINTENANCE: '#6b7280',
};

const bedStatusBg = {
  VACANT: 'bg-green-500',
  OCCUPIED: 'bg-red-500',
  RESERVED: 'bg-yellow-500',
  MAINTENANCE: 'bg-gray-500',
};

const bedColumns = (onReserve, onMaintenance, onDischarge, onTransfer) => [
  { key: 'bedNumber', label: 'Bed' },
  { key: 'patient', label: 'Patient', render: (v) => v?.fullName || '-' },
  { key: 'mrn', label: 'MRN', render: (v, row) => row?.patient?.mrn || '-' },
  { key: 'ward', label: 'Ward', render: (v, row) => row?.ward?.name || '-' },
  { key: 'assignedAt', label: 'Admitted', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'status', label: 'Status', render: (v) => <Badge variant={v === 'OCCUPIED' ? 'success' : v === 'VACANT' ? 'default' : v === 'RESERVED' ? 'warning' : 'danger'}>{v}</Badge> },
  { key: 'actions', label: 'Actions', render: (_, row) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {row.status === 'VACANT' && (
        <>
          <Button size="sm" variant="secondary" onClick={() => onReserve(row.id)}>Reserve</Button>
          <Button size="sm" variant="ghost" onClick={() => onMaintenance(row.id)}>Maint</Button>
        </>
      )}
      {row.status === 'OCCUPIED' && (
        <>
          <Button size="sm" variant="secondary" onClick={() => onTransfer(row)}>Transfer</Button>
          <Button size="sm" variant="danger" onClick={() => onDischarge(row.id)}>Discharge</Button>
        </>
      )}
      {row.status === 'MAINTENANCE' && (
        <Button size="sm" variant="secondary" onClick={() => onMaintenance(row.id)}>Restore</Button>
      )}
    </div>
  )},
];

export default function WardsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('wards');
  const [showWardModal, setShowWardModal] = useState(false);
  const [showBedModal, setShowBedModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [selectedWardFilter, setSelectedWardFilter] = useState('');
  const [wardForm, setWardForm] = useState({ name: '', nameAr: '', type: 'GENERAL', floor: '', capacity: 10, departmentId: '', dailyRate: '' });
  const [bedForm, setBedForm] = useState({ bedNumber: '', wardId: '' });
  const [assignForm, setAssignForm] = useState({ bedId: '', patientId: '', surgeryId: '', admissionDate: new Date().toISOString().slice(0, 10) });
  const [transferForm, setTransferForm] = useState({ sourceBedId: '', targetBedId: '' });
  const [dischargeForm, setDischargeForm] = useState({ bedId: '', dischargeDate: new Date().toISOString().slice(0, 10), dischargeNotes: '' });
  const [selectedBedId, setSelectedBedId] = useState(null);
  const [roundForm, setRoundForm] = useState({ wardId: '', date: new Date().toISOString().slice(0, 10), notes: '', plan: '' });
  const [roundDateFilter, setRoundDateFilter] = useState(new Date().toISOString().slice(0, 10));

  const { data: wards = [], isLoading: wardsLoading, isError: wardsError, refetch: refetchWards } = useWards();
  const { data: beds = [], isLoading: bedsLoading } = useWardBeds(selectedWardFilter ? { wardId: selectedWardFilter } : {});
  const { data: departments = [] } = useDepartments();
  const createWard = useCreateWard();
  const updateWard = useUpdateWard();
  const deleteWard = useDeleteWard();
  const createBed = useCreateBed();
  const assignBed = useAssignBed();
  const dischargeBed = useDischargeBed();
  const reserveBed = useReserveBed();
  const setMaintenance = useSetBedMaintenance();
  const transferBed = useTransferBed();
  const patientSearch = usePatientSearch();
  const { data: rounds = [], isLoading: roundsLoading } = useWardRounds(roundForm.wardId || undefined, roundDateFilter || undefined);
  const createRound = useCreateWardRound();

  const handleSaveWard = async (e) => {
    e.preventDefault();
    const payload = {
      ...wardForm,
      dailyRate: wardForm.dailyRate ? Number(wardForm.dailyRate) : null,
      departmentId: wardForm.departmentId || null,
    };
    if (editingWard) {
      await updateWard.mutateAsync({ id: editingWard.id, ...payload });
    } else {
      await createWard.mutateAsync(payload);
    }
    setShowWardModal(false);
    setEditingWard(null);
    setWardForm({ name: '', nameAr: '', type: 'GENERAL', floor: '', capacity: 10, departmentId: '', dailyRate: '' });
  };

  const handleCreateBed = async (e) => {
    e.preventDefault();
    await createBed.mutateAsync(bedForm);
    setShowBedModal(false);
    setBedForm({ bedNumber: '', wardId: '' });
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!patientSearch.selectedPatient) { toast.error('Please select a patient'); return; }
    await assignBed.mutateAsync({
      bedId: assignForm.bedId,
      patientId: patientSearch.selectedPatient.id,
      surgeryId: assignForm.surgeryId || undefined,
      admissionDate: assignForm.admissionDate || undefined,
    });
    setShowAssignModal(false);
    patientSearch.clearPatient();
    setAssignForm({ bedId: '', patientId: '', surgeryId: '', admissionDate: new Date().toISOString().slice(0, 10) });
  };

  const handleOpenTransfer = (row) => {
    setTransferForm({ sourceBedId: row.id, targetBedId: '' });
    setShowTransferModal(true);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.targetBedId) { toast.error('Please select a target bed'); return; }
    await transferBed.mutateAsync({ bedId: transferForm.sourceBedId, targetBedId: transferForm.targetBedId });
    setShowTransferModal(false);
    setTransferForm({ sourceBedId: '', targetBedId: '' });
    toast.success('Patient transferred');
  };

  const handleReserveBed = async (bedId) => {
    try {
      await reserveBed.mutateAsync(bedId);
      toast.success('Bed reserved');
    } catch { toast.error('Failed to reserve bed'); }
  };

  const handleToggleMaintenance = async (bedId) => {
    try {
      await setMaintenance.mutateAsync(bedId);
      toast.success('Bed maintenance toggled');
    } catch { toast.error('Failed to toggle maintenance'); }
  };

  const handleDischarge = useCallback((bedId) => {
    setDischargeForm({ bedId, dischargeDate: new Date().toISOString().slice(0, 10), dischargeNotes: '' });
    setShowDischargeModal(true);
  }, []);

  const handleConfirmDischarge = async (e) => {
    e.preventDefault();
    try {
      await dischargeBed.mutateAsync({
        bedId: dischargeForm.bedId,
        dischargeDate: dischargeForm.dischargeDate || undefined,
        dischargeNotes: dischargeForm.dischargeNotes || undefined,
      });
      toast.success('Patient discharged');
      setShowDischargeModal(false);
      setDischargeForm({ bedId: '', dischargeDate: new Date().toISOString().slice(0, 10), dischargeNotes: '' });
    } catch { toast.error('Failed to discharge'); }
  };

  const handleCreateRound = async (e) => {
    e.preventDefault();
    if (!roundForm.wardId) { toast.error('Please select a ward'); return; }
    try {
      await createRound.mutateAsync(roundForm);
      setRoundForm((prev) => ({ ...prev, notes: '', plan: '' }));
      toast.success('Ward round recorded');
    } catch { toast.error('Failed to record round'); }
  };

  const selectedBed = beds.find((b) => b.id === selectedBedId);

  const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED');
  const vacantBeds = beds.filter((b) => b.status === 'VACANT');

  return (
    <div className="space-y-6" data-tour="wards">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('wards.title')}</h1>
          <p className="text-body text-slate mt-1">{t('wards.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingWard(null); setWardForm({ name: '', nameAr: '', type: 'GENERAL', floor: '', capacity: 10 }); setShowWardModal(true); }}>{t('wards.addWard')}</Button>
          <Button variant="secondary" onClick={() => setShowBedModal(true)}>{t('wards.addBed')}</Button>
          <Button variant="secondary" onClick={() => { patientSearch.clearPatient(); setShowAssignModal(true); }}>{t('wards.assignPatient')}</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2" role="tablist">
        <Button variant={tab === 'wards' ? 'primary' : 'secondary'} onClick={() => setTab('wards')} role="tab" aria-selected={tab === 'wards'}>{t('wards.tabWards')}</Button>
        <Button variant={tab === 'beds' ? 'primary' : 'secondary'} onClick={() => setTab('beds')} role="tab" aria-selected={tab === 'beds'}>{t('wards.tabBeds')}</Button>
        <Button variant={tab === 'bedmap' ? 'primary' : 'secondary'} onClick={() => setTab('bedmap')} role="tab" aria-selected={tab === 'bedmap'}>{t('wards.bedMap')}</Button>
        <Button variant={tab === 'rounds' ? 'primary' : 'secondary'} onClick={() => setTab('rounds')} role="tab" aria-selected={tab === 'rounds'}>{t('wards.tabRounds')}</Button>
      </div>

      {tab === 'wards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardsLoading && <p className="text-body text-slate col-span-full text-center py-8">{t('common.loading')}</p>}
          {wardsError && (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-body text-red-500">Failed to load wards</p>
              <button
                onClick={() => refetchWards()}
                className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}
          {!wardsLoading && !wardsError && wards.length === 0 && (
            <p className="text-body text-slate col-span-full text-center py-8">{t('wards.noWards')}</p>
          )}
          {wards.map((w) => {
            const wardBeds = beds.filter((b) => b.wardId === w.id);
            const activeCount = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
            const usagePercent = w.capacity > 0 ? Math.round((activeCount / w.capacity) * 100) : 0;
            return (
              <Card key={w.id} className="h-fit">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{w.name}</CardTitle>
                      {w.nameAr && <p className="text-caption text-slate">{w.nameAr}</p>}
                    </div>
                    <Badge variant={
                      w.type === 'ICU' ? 'danger' :
                      w.type === 'MATERNITY' ? 'info' :
                      w.type === 'PEDIATRICS' ? 'primary' : 'default'
                    } size="sm">{w.type || 'GENERAL'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-caption text-slate">
                    <span>Floor {w.floor || '-'}</span>
                    <span>{activeCount} / {w.capacity} beds</span>
                  </div>
                  {w.dailyRate != null && <p className="text-caption text-slate">Daily Rate: ${Number(w.dailyRate).toFixed(2)}</p>}
                  <div className="w-full bg-bone rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usagePercent > 90 ? 'bg-red-400' : usagePercent > 70 ? 'bg-amber-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingWard(w); setWardForm({ name: w.name, nameAr: w.nameAr || '', type: w.type || 'GENERAL', floor: w.floor || '', capacity: w.capacity, departmentId: w.departmentId || '', dailyRate: w.dailyRate ?? '' }); setShowWardModal(true); }}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete this ward?')) deleteWard.mutate(w.id); }}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'beds' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('wards.tabBeds')} ({beds.length})</CardTitle>
              <select value={selectedWardFilter} onChange={(e) => setSelectedWardFilter(e.target.value)}
                className="px-3 py-1.5 bg-paper border border-silver rounded-lg text-caption text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">{t('wards.allWards')}</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {bedsLoading ? (
              <p className="text-body text-slate">{t('wards.loadingBeds')}</p>
            ) : beds.length === 0 ? (
              <p className="text-body text-slate text-center py-8">{t('wards.noBeds')}</p>
            ) : (
              <>
                <div className="mb-4 flex gap-2">
                  <span className="text-caption text-slate">{t('wards.occupied')}: {occupiedBeds.length}</span>
                  <span className="text-caption text-slate">{t('wards.vacant')}: {vacantBeds.length}</span>
                </div>
                <Table
                  columns={bedColumns(handleReserveBed, handleToggleMaintenance, handleDischarge, handleOpenTransfer)}
                  data={beds}
                  onRowClick={(row) => setSelectedBedId(selectedBedId === row.id ? null : row.id)}
                />
                {selectedBed && selectedBed.status === 'OCCUPIED' && (
                  <BedDetailPanel bed={selectedBed} onClose={() => setSelectedBedId(null)} />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'bedmap' && (
        <div className="space-y-6">
          {wardsLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-bone animate-pulse" />
              ))}
            </div>
          )}
          {wardsError && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-body text-red-500">Failed to load wards</p>
              <button
                onClick={() => refetchWards()}
                className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}
          {!wardsLoading && !wardsError && wards.length === 0 && (
            <p className="text-body text-slate text-center py-8">{t('wards.noWards')}</p>
          )}
          {!wardsLoading && !wardsError && wards.map((w) => {
            const wardBeds = beds.filter((b) => b.wardId === w.id);
            const occupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
            const vacant = wardBeds.filter((b) => b.status === 'VACANT').length;
            const reserved = wardBeds.filter((b) => b.status === 'RESERVED').length;
            const maintenance = wardBeds.filter((b) => b.status === 'MAINTENANCE').length;
            return (
              <Card key={w.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{w.name}</CardTitle>
                    <div className="flex gap-3 text-caption text-slate">
                      <span>{occupied} {t('wards.occupied')}</span>
                      <span>{vacant} {t('wards.vacant')}</span>
                      {reserved > 0 && <span>{reserved} {t('wards.reserved')}</span>}
                      {maintenance > 0 && <span>{maintenance} {t('wards.maintenance')}</span>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {bedsLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {Array.from({ length: w.capacity || 6 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-lg bg-bone animate-pulse" />
                      ))}
                    </div>
                  ) : wardBeds.length === 0 ? (
                    <p className="text-body text-slate text-center py-4">{t('wards.noBedsInWard')}</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {wardBeds.map((bed) => (
                        <button
                          key={bed.id}
                          className={`rounded-lg p-3 text-left transition-all hover:shadow-md border-2 ${
                            selectedBedId === bed.id && bed.status === 'OCCUPIED'
                              ? 'ring-2 ring-lilac-bloom'
                              : ''
                          }`}
                          style={{ backgroundColor: `${bedStatusColors[bed.status]}20`, borderColor: bedStatusColors[bed.status] }}
                          onClick={() => {
                            if (bed.status === 'VACANT') {
                              setAssignForm((prev) => ({ ...prev, bedId: bed.id }));
                              patientSearch.clearPatient();
                              setShowAssignModal(true);
                            } else if (bed.status === 'OCCUPIED') {
                              setSelectedBedId(selectedBedId === bed.id ? null : bed.id);
                            }
                          }}
                        >
                          <p className="text-sm font-semibold text-obsidian">{bed.bedNumber}</p>
                          <p className="text-xs text-slate">
                            {bed.status === 'OCCUPIED' ? (bed.patient?.fullName?.slice(0, 15) || 'Occupied') : bed.status}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
                {selectedBedId && wardBeds.some((b) => b.id === selectedBedId) && (
                  <CardContent>
                    <BedDetailPanel bed={wardBeds.find((b) => b.id === selectedBedId)} onClose={() => setSelectedBedId(null)} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showWardModal} onClose={() => setShowWardModal(false)} title={editingWard ? t('wards.editWard') : t('wards.addWard')}>
        <form onSubmit={handleSaveWard} className="space-y-4">
          <Input label="Name (English)" required value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} />
          <Input label="Name (Arabic)" value={wardForm.nameAr} onChange={(e) => setWardForm({ ...wardForm, nameAr: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t('wards.type')}</label>
            <select required value={wardForm.type} onChange={(e) => setWardForm({ ...wardForm, type: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="GENERAL">{t('wards.general')}</option>
              <option value="ICU">{t('wards.icu')}</option>
              <option value="MATERNITY">{t('wards.maternity')}</option>
              <option value="PEDIATRICS">{t('wards.pediatrics')}</option>
              <option value="SURGICAL">{t('wards.surgical')}</option>
              <option value="ISOLATION">{t('wards.isolation')}</option>
            </select>
          </div>
          <Input label={t('wards.floor')} value={wardForm.floor} onChange={(e) => setWardForm({ ...wardForm, floor: e.target.value })} />
          <Input label={t('wards.capacity')} type="number" min="1" required value={wardForm.capacity} onChange={(e) => setWardForm({ ...wardForm, capacity: parseInt(e.target.value) || 1 })} />
          <Input label={t('wards.dailyRate')} type="number" min="0" step="0.01" value={wardForm.dailyRate} onChange={(e) => setWardForm({ ...wardForm, dailyRate: e.target.value })} placeholder="0.00" />
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t('wards.department')}</label>
            <select value={wardForm.departmentId} onChange={(e) => setWardForm({ ...wardForm, departmentId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="">{t('wards.noDepartment')}</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowWardModal(false)} className="flex-1">{t('wards.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={createWard.isPending || updateWard.isPending}>{editingWard ? t('wards.update') : t('wards.create')} {t('wards.ward')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showBedModal} onClose={() => setShowBedModal(false)} title={t('wards.addBed')}>
        <form onSubmit={handleCreateBed} className="space-y-4">
          <Input label={t('wards.bedNumber')} required value={bedForm.bedNumber} onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t('wards.ward')}</label>
            <select required value={bedForm.wardId} onChange={(e) => setBedForm({ ...bedForm, wardId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="">{t('wards.selectWard')}</option>
              {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowBedModal(false)} className="flex-1">{t('wards.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={createBed.isPending}>{t('wards.addBed')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showAssignModal} onClose={() => { setShowAssignModal(false); patientSearch.clearPatient(); }} title={t('wards.assignPatient')}>
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t('wards.patient')}</label>
            {patientSearch.selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-bone rounded-lg">
                <div>
                  <p className="text-body font-medium text-obsidian">{patientSearch.selectedPatient.fullName}</p>
                  <p className="text-caption text-slate">MRN: {patientSearch.selectedPatient.mrn}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={patientSearch.clearPatient}>{t('wards.change')}</Button>
              </div>
            ) : (
              <div>
                <input value={patientSearch.query} onChange={(e) => patientSearch.setQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  placeholder={t('wards.searchPatient')}
                  autoComplete="off"
                />
                {patientSearch.query.length >= 2 && (
                  <div className="mt-1 border border-silver rounded-lg max-h-40 overflow-y-auto bg-paper">
                    {patientSearch.loading && <p className="p-3 text-caption text-slate">{t('wards.searching')}</p>}
                    {!patientSearch.loading && patientSearch.results.length === 0 && (
                      <p className="p-3 text-caption text-slate">{t('wards.noPatients')}</p>
                    )}
                    {patientSearch.results.map((p) => (
                      <button key={p.id} type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-bone border-b border-silver last:border-b-0 transition-colors"
                        onClick={() => patientSearch.selectPatient(p)}
                      >
                        <span className="text-body text-obsidian">{p.fullName}</span>
                        <span className="text-caption text-slate ml-2">MRN: {p.mrn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t('wards.bed')}</label>
              <select required value={assignForm.bedId} onChange={(e) => setAssignForm({ ...assignForm, bedId: e.target.value })}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">{t('wards.selectBed')}</option>
                {beds.filter((b) => b.status === 'VACANT').map((b) => (
                  <option key={b.id} value={b.id}>{b.bedNumber} — {wards.find((w) => w.id === b.wardId)?.name || b.wardId}</option>
                ))}
              </select>
              <p className="text-caption text-slate mt-1">{t('wards.showingVacant')}</p>
          </div>
          <Input label={t('wards.surgeryId')} value={assignForm.surgeryId} onChange={(e) => setAssignForm({ ...assignForm, surgeryId: e.target.value })} placeholder={t('wards.linkToSurgery')} />
          <Input label={t('wards.admissionDate')} type="date" value={assignForm.admissionDate} onChange={(e) => setAssignForm({ ...assignForm, admissionDate: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowAssignModal(false); patientSearch.clearPatient(); }} className="flex-1">{t('wards.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={assignBed.isPending} disabled={!patientSearch.selectedPatient}>{t('wards.assign')}</Button>
          </div>
        </form>
      </Modal>

      {tab === 'rounds' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader><CardTitle>{t('wards.newRound')}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRound} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">{t('wards.ward')}</label>
                  <select required value={roundForm.wardId} onChange={(e) => setRoundForm({ ...roundForm, wardId: e.target.value })}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    <option value="">{t('wards.selectWard')}</option>
                    {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <Input label={t('wards.date')} type="date" required value={roundForm.date} onChange={(e) => setRoundForm({ ...roundForm, date: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">{t('wards.notes')}</label>
                  <textarea value={roundForm.notes} onChange={(e) => setRoundForm({ ...roundForm, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">{t('wards.plan')}</label>
                  <textarea value={roundForm.plan} onChange={(e) => setRoundForm({ ...roundForm, plan: e.target.value })}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom min-h-[80px]" />
                </div>
                <Button type="submit" className="w-full" loading={createRound.isPending}>{t('wards.recordRound')}</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('wards.wardRounds')}</CardTitle>
                <div className="flex gap-2 items-center">
                    <Button variant="secondary" size="sm" onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) return;
                      const wardLabel = roundForm.wardId ? wards.find((w) => w.id === roundForm.wardId)?.name : 'All Wards';
                      const rows = rounds.map((r) => `<tr><td style="border:1px solid #333;padding:4px 8px;">${r.ward?.name || '-'}</td><td style="border:1px solid #333;padding:4px 8px;">${new Date(r.date).toLocaleDateString()}</td><td style="border:1px solid #333;padding:4px 8px;">${r.doctor?.fullName || '-'}</td><td style="border:1px solid #333;padding:4px 8px;">${r.notes || ''}</td><td style="border:1px solid #333;padding:4px 8px;">${r.plan || ''}</td></tr>`).join('');
                      printWindow.document.write(`
                        <html><head><title>Ward Rounds</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 2cm; font-size: 12pt; }
                          h1 { font-size: 18pt; margin-bottom: 0.5cm; }
                          .header { text-align: center; margin-bottom: 1cm; border-bottom: 2px solid #333; padding-bottom: 0.5cm; }
                          table { width: 100%; border-collapse: collapse; margin: 0.5cm 0; }
                          th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; font-size: 11pt; }
                          th { background: #f0f0f0; font-weight: bold; }
                          .footer { margin-top: 2cm; font-size: 10pt; color: #666; text-align: center; }
                        </style></head><body>
                          <div class="header">
                            <h1>Ward Rounds Sheet</h1>
                            <p>${wardLabel} — ${roundDateFilter || new Date().toLocaleDateString()}</p>
                          </div>
                          ${rounds.length === 0 ? '<p>No rounds recorded for this period.</p>' : `
                          <table>
                            <thead><tr><th>Ward</th><th>Date</th><th>Doctor</th><th>Notes</th><th>Plan</th></tr></thead>
                            <tbody>${rows}</tbody>
                          </table>`}
                          <div class="footer">Printed at ${new Date().toLocaleString()}</div>
                        </body></html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }}><Printer size={14} className="mr-1" /> Print Rounds</Button>
                    <div>
                      <label className="text-caption text-slate mr-1">{t('wards.ward')}:</label>
                      <select value={roundForm.wardId} onChange={(e) => setRoundForm({ ...roundForm, wardId: e.target.value })}
                        className="px-2 py-1 bg-paper border border-silver rounded text-caption">
                        <option value="">{t('wards.all')}</option>
                        {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                    <Input type="date" value={roundDateFilter} onChange={(e) => setRoundDateFilter(e.target.value)} className="w-40" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {roundsLoading ? (
                <p className="text-body text-slate">{t('wards.loadingRounds')}</p>
              ) : rounds.length === 0 ? (
                <p className="text-body text-slate text-center py-8">{t('wards.noRounds')}</p>
              ) : (
                <div className="space-y-3">
                  {rounds.map((r) => (
                    <div key={r.id} className="bg-bone/30 rounded-lg p-4 border border-silver space-y-2">
                      <div className="flex items-center justify-between text-caption text-slate">
                        <span className="font-medium text-obsidian">{r.ward?.name || '-'}</span>
                        <span>{new Date(r.date).toLocaleDateString()} — {r.doctor?.fullName || '-'}</span>
                      </div>
                      {r.notes && <p className="text-body text-obsidian"><strong>{t('wards.notes')}:</strong> {r.notes}</p>}
                      {r.plan && <p className="text-body text-obsidian"><strong>{t('wards.plan')}:</strong> {r.plan}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Modal open={showTransferModal} onClose={() => setShowTransferModal(false)} title={t('wards.transferTitle')}>
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t('wards.targetBed')}</label>
            <select required value={transferForm.targetBedId} onChange={(e) => setTransferForm({ ...transferForm, targetBedId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="">{t('wards.selectTargetBed')}</option>
              {beds.filter((b) => b.status === 'VACANT').map((b) => (
                <option key={b.id} value={b.id}>{b.bedNumber} — {wards.find((w) => w.id === b.wardId)?.name || b.wardId}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowTransferModal(false)} className="flex-1">{t('wards.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={transferBed.isPending}>{t('wards.transfer')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showDischargeModal} onClose={() => setShowDischargeModal(false)} title={t('wards.dischargeTitle')}>
        <form onSubmit={handleConfirmDischarge} className="space-y-4">
          <Input
            label={t('wards.dischargeDate')}
            type="date"
            required
            value={dischargeForm.dischargeDate}
            onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDate: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t('wards.dischargeNotes')}</label>
            <textarea
              value={dischargeForm.dischargeNotes}
              onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeNotes: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom min-h-[80px]"
              placeholder={t('wards.dischargeNotesPlaceholder')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowDischargeModal(false)} className="flex-1">{t('wards.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={dischargeBed.isPending}>{t('wards.dischargeConfirm')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
