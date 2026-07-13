import { useState } from 'react';
import { useWards, useWardBeds, useCreateWard, useUpdateWard, useDeleteWard, useCreateBed, useAssignBed, useDischargeBed, useReserveBed, useSetBedMaintenance, useTransferBed, useWardRounds, useCreateWardRound } from '../../hooks/queries/useWards';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { useDepartments } from '../../hooks/queries/useAdmin';
import { usePatientSearch } from '../../hooks/usePatients';
import BedDetailPanel from './BedDetailPanel';

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
  const [tab, setTab] = useState('wards');
  const [showWardModal, setShowWardModal] = useState(false);
  const [showBedModal, setShowBedModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [selectedWardFilter, setSelectedWardFilter] = useState('');
  const [wardForm, setWardForm] = useState({ name: '', nameAr: '', type: 'GENERAL', floor: '', capacity: 10, departmentId: '', dailyRate: '' });
  const [bedForm, setBedForm] = useState({ bedNumber: '', wardId: '' });
  const [assignForm, setAssignForm] = useState({ bedId: '', patientId: '', surgeryId: '' });
  const [transferForm, setTransferForm] = useState({ sourceBedId: '', targetBedId: '' });
  const [selectedBedId, setSelectedBedId] = useState(null);
  const [roundForm, setRoundForm] = useState({ wardId: '', date: new Date().toISOString().slice(0, 10), notes: '', plan: '' });
  const [roundDateFilter, setRoundDateFilter] = useState(new Date().toISOString().slice(0, 10));

  const { data: wards = [], isLoading: wardsLoading } = useWards();
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
    });
    setShowAssignModal(false);
    patientSearch.clearPatient();
    setAssignForm({ bedId: '', patientId: '', surgeryId: '' });
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

  const handleDischarge = async (bedId) => {
    if (!confirm('Discharge patient from this bed?')) return;
    try {
      await dischargeBed.mutateAsync(bedId);
      toast.success('Patient discharged');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Wards</h1>
          <p className="text-body text-slate mt-1">Manage wards, bed assignments & patient admissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingWard(null); setWardForm({ name: '', nameAr: '', type: 'GENERAL', floor: '', capacity: 10 }); setShowWardModal(true); }}>Add Ward</Button>
          <Button variant="secondary" onClick={() => setShowBedModal(true)}>Add Bed</Button>
          <Button variant="secondary" onClick={() => { patientSearch.clearPatient(); setShowAssignModal(true); }}>Assign Patient</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2">
        <Button variant={tab === 'wards' ? 'primary' : 'secondary'} onClick={() => setTab('wards')}>Wards</Button>
        <Button variant={tab === 'beds' ? 'primary' : 'secondary'} onClick={() => setTab('beds')}>Beds</Button>
        <Button variant={tab === 'rounds' ? 'primary' : 'secondary'} onClick={() => setTab('rounds')}>Rounds</Button>
      </div>

      {tab === 'wards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardsLoading && <p className="text-body text-slate col-span-full text-center py-8">Loading wards...</p>}
          {!wardsLoading && wards.length === 0 && (
            <p className="text-body text-slate col-span-full text-center py-8">No wards found. Create one to get started.</p>
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
              <CardTitle>Beds ({beds.length})</CardTitle>
              <select value={selectedWardFilter} onChange={(e) => setSelectedWardFilter(e.target.value)}
                className="px-3 py-1.5 bg-paper border border-silver rounded-lg text-caption text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">All Wards</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {bedsLoading ? (
              <p className="text-body text-slate">Loading beds...</p>
            ) : beds.length === 0 ? (
              <p className="text-body text-slate text-center py-8">No beds found for this ward.</p>
            ) : (
              <>
                <div className="mb-4 flex gap-2">
                  <span className="text-caption text-slate">Occupied: {occupiedBeds.length}</span>
                  <span className="text-caption text-slate">Vacant: {vacantBeds.length}</span>
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

      <Modal open={showWardModal} onClose={() => setShowWardModal(false)} title={editingWard ? 'Edit Ward' : 'Add Ward'}>
        <form onSubmit={handleSaveWard} className="space-y-4">
          <Input label="Name (English)" required value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} />
          <Input label="Name (Arabic)" value={wardForm.nameAr} onChange={(e) => setWardForm({ ...wardForm, nameAr: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Type</label>
            <select required value={wardForm.type} onChange={(e) => setWardForm({ ...wardForm, type: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="GENERAL">General</option>
              <option value="ICU">ICU</option>
              <option value="MATERNITY">Maternity</option>
              <option value="PEDIATRICS">Pediatrics</option>
              <option value="SURGICAL">Surgical</option>
              <option value="ISOLATION">Isolation</option>
            </select>
          </div>
          <Input label="Floor" value={wardForm.floor} onChange={(e) => setWardForm({ ...wardForm, floor: e.target.value })} />
          <Input label="Capacity (beds)" type="number" min="1" required value={wardForm.capacity} onChange={(e) => setWardForm({ ...wardForm, capacity: parseInt(e.target.value) || 1 })} />
          <Input label="Daily Rate (per night)" type="number" min="0" step="0.01" value={wardForm.dailyRate} onChange={(e) => setWardForm({ ...wardForm, dailyRate: e.target.value })} placeholder="0.00" />
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Department</label>
            <select value={wardForm.departmentId} onChange={(e) => setWardForm({ ...wardForm, departmentId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="">No department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowWardModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={createWard.isPending || updateWard.isPending}>{editingWard ? 'Update' : 'Create'} Ward</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showBedModal} onClose={() => setShowBedModal(false)} title="Add Bed">
        <form onSubmit={handleCreateBed} className="space-y-4">
          <Input label="Bed Number" required value={bedForm.bedNumber} onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Ward</label>
            <select required value={bedForm.wardId} onChange={(e) => setBedForm({ ...bedForm, wardId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="">Select ward</option>
              {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowBedModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={createBed.isPending}>Add Bed</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showAssignModal} onClose={() => { setShowAssignModal(false); patientSearch.clearPatient(); }} title="Assign Patient to Bed">
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Patient</label>
            {patientSearch.selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-bone rounded-lg">
                <div>
                  <p className="text-body font-medium text-obsidian">{patientSearch.selectedPatient.fullName}</p>
                  <p className="text-caption text-slate">MRN: {patientSearch.selectedPatient.mrn}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={patientSearch.clearPatient}>Change</Button>
              </div>
            ) : (
              <div>
                <input value={patientSearch.query} onChange={(e) => patientSearch.setQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  placeholder="Search by name, MRN, phone..."
                  autoComplete="off"
                />
                {patientSearch.query.length >= 2 && (
                  <div className="mt-1 border border-silver rounded-lg max-h-40 overflow-y-auto bg-paper">
                    {patientSearch.loading && <p className="p-3 text-caption text-slate">Searching...</p>}
                    {!patientSearch.loading && patientSearch.results.length === 0 && (
                      <p className="p-3 text-caption text-slate">No patients found</p>
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
            <label className="text-sm font-medium text-graphite block mb-1">Bed</label>
              <select required value={assignForm.bedId} onChange={(e) => setAssignForm({ ...assignForm, bedId: e.target.value })}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">Select bed</option>
                {beds.filter((b) => b.status === 'VACANT').map((b) => (
                  <option key={b.id} value={b.id}>{b.bedNumber} — {wards.find((w) => w.id === b.wardId)?.name || b.wardId}</option>
                ))}
              </select>
              <p className="text-caption text-slate mt-1">Showing all vacant beds</p>
          </div>
          <Input label="Surgery ID (optional)" value={assignForm.surgeryId} onChange={(e) => setAssignForm({ ...assignForm, surgeryId: e.target.value })} placeholder="Link to a surgery" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowAssignModal(false); patientSearch.clearPatient(); }} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={assignBed.isPending} disabled={!patientSearch.selectedPatient}>Assign</Button>
          </div>
        </form>
      </Modal>

      {tab === 'rounds' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader><CardTitle>New Round</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRound} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Ward</label>
                  <select required value={roundForm.wardId} onChange={(e) => setRoundForm({ ...roundForm, wardId: e.target.value })}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    <option value="">Select ward</option>
                    {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <Input label="Date" type="date" required value={roundForm.date} onChange={(e) => setRoundForm({ ...roundForm, date: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Notes</label>
                  <textarea value={roundForm.notes} onChange={(e) => setRoundForm({ ...roundForm, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Plan</label>
                  <textarea value={roundForm.plan} onChange={(e) => setRoundForm({ ...roundForm, plan: e.target.value })}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom min-h-[80px]" />
                </div>
                <Button type="submit" className="w-full" loading={createRound.isPending}>Record Round</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ward Rounds</CardTitle>
                <div className="flex gap-2 items-center">
                  <div>
                    <label className="text-caption text-slate mr-1">Ward:</label>
                    <select value={roundForm.wardId} onChange={(e) => setRoundForm({ ...roundForm, wardId: e.target.value })}
                      className="px-2 py-1 bg-paper border border-silver rounded text-caption">
                      <option value="">All</option>
                      {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <Input type="date" value={roundDateFilter} onChange={(e) => setRoundDateFilter(e.target.value)} className="w-40" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {roundsLoading ? (
                <p className="text-body text-slate">Loading rounds...</p>
              ) : rounds.length === 0 ? (
                <p className="text-body text-slate text-center py-8">No rounds recorded</p>
              ) : (
                <div className="space-y-3">
                  {rounds.map((r) => (
                    <div key={r.id} className="bg-bone/30 rounded-lg p-4 border border-silver space-y-2">
                      <div className="flex items-center justify-between text-caption text-slate">
                        <span className="font-medium text-obsidian">{r.ward?.name || '-'}</span>
                        <span>{new Date(r.date).toLocaleDateString()} — {r.doctor?.fullName || '-'}</span>
                      </div>
                      {r.notes && <p className="text-body text-obsidian"><strong>Notes:</strong> {r.notes}</p>}
                      {r.plan && <p className="text-body text-obsidian"><strong>Plan:</strong> {r.plan}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Modal open={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Patient to Another Bed">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Target Bed</label>
            <select required value={transferForm.targetBedId} onChange={(e) => setTransferForm({ ...transferForm, targetBedId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="">Select vacant bed</option>
              {beds.filter((b) => b.status === 'VACANT').map((b) => (
                <option key={b.id} value={b.id}>{b.bedNumber} — {wards.find((w) => w.id === b.wardId)?.name || b.wardId}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowTransferModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={transferBed.isPending}>Transfer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
