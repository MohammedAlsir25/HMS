import { useState } from 'react';
import { useWards, useWardBeds } from '../../hooks/queries/useWards';
import { useBedVitals, useRecordVital, useBedNursingNotes, useCreateNursingNote, useWardRounds, useCreateWardRound } from '../../hooks/queries/useInpatient';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const statusColors = {
  VACANT: { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-300', text: 'text-green-700' },
  OCCUPIED: { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-300', text: 'text-blue-700' },
  RESERVED: { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-300', text: 'text-amber-700' },
  MAINTENANCE: { bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300', text: 'text-red-700' },
};

export default function InpatientPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedBed, setSelectedBed] = useState(null);
  const [activeTab, setActiveTab] = useState('vitals');
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showRoundForm, setShowRoundForm] = useState(false);

  const { data: wards = [] } = useWards();
  const { data: beds = [] } = useWardBeds(selectedWard ? { wardId: selectedWard } : {});

  const vitalForm = useRecordVital();
  const noteForm = useCreateNursingNote();
  const roundForm = useCreateWardRound();

  const { data: vitals = [] } = useBedVitals(selectedBed?.id);
  const { data: nursingNotes = [] } = useBedNursingNotes(selectedBed?.id);
  const { data: rounds = [] } = useWardRounds(selectedWard, today);

  const [vitalInputs, setVitalInputs] = useState({
    temperature: '', heartRate: '', bloodPressureSystolic: '', bloodPressureDiastolic: '',
    respiratoryRate: '', oxygenSaturation: '', painScore: '', notes: '',
  });
  const [newNote, setNewNote] = useState('');
  const [roundDate, setRoundDate] = useState(today);
  const [roundNotes, setRoundNotes] = useState('');
  const [roundPlan, setRoundPlan] = useState('');

  const handleRecordVital = () => {
    const data = {};
    Object.entries(vitalInputs).forEach(([k, v]) => { if (v !== '') data[k] = Number(v); });
    vitalForm.mutate({ bedId: selectedBed.id, ...data }, {
      onSuccess: () => { setShowVitalForm(false); setVitalInputs({ temperature: '', heartRate: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', respiratoryRate: '', oxygenSaturation: '', painScore: '', notes: '' }); toast.success('Vitals recorded'); },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedBed) return;
    noteForm.mutate({ bedId: selectedBed.id, content: newNote.trim() }, {
      onSuccess: () => { setNewNote(''); setShowNoteForm(false); toast.success('Note added'); },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleAddRound = () => {
    if (!roundDate || !selectedWard) return;
    roundForm.mutate({ wardId: selectedWard, date: roundDate, notes: roundNotes, plan: roundPlan }, {
      onSuccess: () => { setShowRoundForm(false); setRoundNotes(''); setRoundPlan(''); toast.success('Round recorded'); },
      onError: (err) => toast.error(err.message),
    });
  };

  const selectedWardName = wards.find((w) => w.id === selectedWard)?.name || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">In-Patient Management</h1>
          <p className="text-body text-slate mt-1">Vitals, nursing notes, and daily rounds</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="ward-select" className="text-sm font-medium text-graphite">Ward</label>
          <select
            id="ward-select"
            value={selectedWard}
            onChange={(e) => { setSelectedWard(e.target.value); setSelectedBed(null); }}
            className="px-4 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          >
            <option value="">Select ward...</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.beds?.length || 0} beds)</option>
            ))}
          </select>
        </div>
      </div>

      {selectedWard && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{selectedWardName} — Bed Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {beds.map((bed) => {
                    const colors = statusColors[bed.status] || statusColors.VACANT;
                    return (
                      <button
                        key={bed.id}
                        className={`rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${colors.bg} ${colors.border} ${selectedBed?.id === bed.id ? 'ring-2 ring-lilac-bloom' : ''}`}
                        onClick={() => setSelectedBed(bed)}
                      >
                        <p className="text-sm font-semibold text-obsidian">{bed.bedNumber}</p>
                        <p className={`text-xs ${colors.text}`}>
                          {bed.status === 'OCCUPIED' ? bed.patient?.fullName?.slice(0, 15) || 'Occupied' : bed.status}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daily Rounds — {today}</CardTitle>
                  <Button size="sm" onClick={() => setShowRoundForm(true)}>Add Round</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-60 overflow-y-auto">
                {rounds.length === 0 && <p className="text-caption text-slate text-center py-4">No rounds recorded today</p>}
                {rounds.map((r) => (
                  <div key={r.id} className="rounded-lg border border-silver p-3">
                    <p className="text-caption text-slate">Dr. {r.doctor?.fullName} &middot; {new Date(r.date).toLocaleString()}</p>
                    {r.notes && <p className="text-body text-obsidian mt-1 whitespace-pre-wrap">{r.notes}</p>}
                    {r.plan && (
                      <div className="mt-2 pt-2 border-t border-silver/50">
                        <p className="text-caption text-slate font-medium">Plan:</p>
                        <p className="text-body text-obsidian whitespace-pre-wrap">{r.plan}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {selectedBed ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Bed {selectedBed.bedNumber}
                      {selectedBed.patient && <span className="text-sm font-normal text-slate ml-2">— {selectedBed.patient.fullName}</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {['vitals', 'notes'].map((tab) => (
                        <button
                          key={tab}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${activeTab === tab ? 'bg-lilac-bloom text-paper border-lilac-bloom' : 'bg-paper text-graphite border-silver'}`}
                          onClick={() => setActiveTab(tab)}
                        >
                          {tab === 'vitals' ? 'Vitals' : 'Nursing Notes'}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {activeTab === 'vitals' && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Vital Signs</CardTitle>
                        <Button size="sm" onClick={() => setShowVitalForm(true)}>Record</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                      {vitals.length === 0 && <p className="text-caption text-slate text-center py-4">No vitals recorded</p>}
                      {vitals.map((v) => (
                        <div key={v.id} className="rounded-lg border border-silver p-3">
                          <p className="text-caption text-slate">{new Date(v.recordedAt).toLocaleString()} — {v.recordedBy?.fullName}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-body text-obsidian">
                            {v.temperature !== null && <p>Temp: <strong>{Number(v.temperature).toFixed(1)}°C</strong></p>}
                            {v.heartRate !== null && <p>HR: <strong>{v.heartRate} bpm</strong></p>}
                            {v.bloodPressureSystolic !== null && <p>BP: <strong>{v.bloodPressureSystolic}/{v.bloodPressureDiastolic || '?'} mmHg</strong></p>}
                            {v.respiratoryRate !== null && <p>RR: <strong>{v.respiratoryRate} /min</strong></p>}
                            {v.oxygenSaturation !== null && <p>SpO₂: <strong>{v.oxygenSaturation}%</strong></p>}
                            {v.painScore !== null && <p>Pain: <strong>{v.painScore}/10</strong></p>}
                          </div>
                          {v.notes && <p className="text-caption text-slate mt-1">{v.notes}</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'notes' && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Nursing Notes</CardTitle>
                        <Button size="sm" onClick={() => setShowNoteForm(true)}>Add</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                      {nursingNotes.length === 0 && <p className="text-caption text-slate text-center py-4">No nursing notes</p>}
                      {nursingNotes.map((n) => (
                        <div key={n.id} className="rounded-lg border border-silver p-3">
                          <p className="text-body text-obsidian whitespace-pre-wrap">{n.content}</p>
                          <p className="text-caption text-slate mt-1">{n.createdBy?.fullName} &middot; {new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent>
                  <p className="text-body text-slate text-center py-8">Select a bed to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Modal open={showVitalForm} onClose={() => setShowVitalForm(false)} title="Record Vital Signs">
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'temperature', label: 'Temperature (°C)', type: 'number', step: '0.1' },
            { key: 'heartRate', label: 'Heart Rate (bpm)', type: 'number' },
            { key: 'bloodPressureSystolic', label: 'BP Systolic', type: 'number' },
            { key: 'bloodPressureDiastolic', label: 'BP Diastolic', type: 'number' },
            { key: 'respiratoryRate', label: 'Respiratory Rate (/min)', type: 'number' },
            { key: 'oxygenSaturation', label: 'SpO₂ (%)', type: 'number' },
            { key: 'painScore', label: 'Pain Score (0-10)', type: 'number', min: 0, max: 10 },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-graphite mb-1">{field.label}</label>
              <input
                type={field.type}
                step={field.step}
                min={field.min}
                max={field.max}
                value={vitalInputs[field.key]}
                onChange={(e) => setVitalInputs({ ...vitalInputs, [field.key]: e.target.value })}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-graphite mb-1">Notes</label>
            <textarea
              value={vitalInputs.notes}
              onChange={(e) => setVitalInputs({ ...vitalInputs, notes: e.target.value })}
              className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={2}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => setShowVitalForm(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleRecordVital} className="flex-1" loading={vitalForm.isPending}>Record</Button>
        </div>
      </Modal>

      <Modal open={showNoteForm} onClose={() => setShowNoteForm(false)} title="Add Nursing Note">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
          rows={4}
          placeholder="Nursing observation, care provided, patient response..."
        />
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => setShowNoteForm(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleAddNote} className="flex-1" loading={noteForm.isPending} disabled={!newNote.trim()}>Add Note</Button>
        </div>
      </Modal>

      <Modal open={showRoundForm} onClose={() => setShowRoundForm(false)} title="Record Daily Round">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Date</label>
            <input
              type="date"
              value={roundDate}
              onChange={(e) => setRoundDate(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Round Notes</label>
            <textarea
              value={roundNotes}
              onChange={(e) => setRoundNotes(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              placeholder="Clinical observations, patient status, concerns..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Plan</label>
            <textarea
              value={roundPlan}
              onChange={(e) => setRoundPlan(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              placeholder="Treatment plan, medication changes, investigations..."
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => setShowRoundForm(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleAddRound} className="flex-1" loading={roundForm.isPending} disabled={!roundDate}>Save Round</Button>
        </div>
      </Modal>
    </div>
  );
}
