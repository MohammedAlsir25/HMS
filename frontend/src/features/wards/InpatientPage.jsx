import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWards, useWardBeds, useWardDashboard, useWardPatients } from '../../hooks/queries/useWards';
import { useBedVitals, useRecordVital, useBedNursingNotes, useCreateNursingNote, useWardRounds, useCreateWardRound } from '../../hooks/queries/useInpatient';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = {
  VACANT: { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-300', text: 'text-green-700' },
  OCCUPIED: { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-300', text: 'text-blue-700' },
  RESERVED: { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-300', text: 'text-amber-700' },
  MAINTENANCE: { bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300', text: 'text-red-700' },
};

export default function InpatientPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedBed, setSelectedBed] = useState(null);
  const [activeTab, setActiveTab] = useState('vitals');
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showRoundForm, setShowRoundForm] = useState(false);

  const { data: wards = [] } = useWards();
  const { data: beds = [] } = useWardBeds(selectedWard ? { wardId: selectedWard } : {});
  const { data: dashboard, isLoading: dashboardLoading, isError: dashboardError, refetch: refetchDashboard } = useWardDashboard();
  const { data: wardPatients = [], isLoading: patientsLoading } = useWardPatients(selectedWard);

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
  const [selectedRoundPatient, setSelectedRoundPatient] = useState(null);

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
    <div className="space-y-6" data-tour="inpatient">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('inpatient.title')}</h1>
          <p className="text-body text-slate mt-1">{t('inpatient.description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="ward-select" className="text-sm font-medium text-graphite">{t('inpatient.wardLabel')}</label>
          <select
            id="ward-select"
            value={selectedWard}
            onChange={(e) => { setSelectedWard(e.target.value); setSelectedBed(null); setSelectedRoundPatient(null); }}
            className="px-4 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          >
            <option value="">{t('inpatient.selectWard')}</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.beds?.length || 0} beds)</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="h-4 bg-bone rounded w-20 mb-2" />
                  <div className="h-8 bg-bone rounded w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : dashboardError ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-4 py-8">
            <p className="text-body text-red-500">Failed to load dashboard</p>
            <button
              onClick={() => refetchDashboard()}
              className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="py-4">
                <p className="text-caption text-slate uppercase tracking-wide">{t('inpatient.totalBeds')}</p>
                <p className="text-heading-sm font-semibold text-obsidian mt-1">{dashboard?.totalBeds ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-caption text-slate uppercase tracking-wide">{t('inpatient.occupiedBeds')}</p>
                <p className="text-heading-sm font-semibold text-obsidian mt-1">{dashboard?.occupiedBeds ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-caption text-slate uppercase tracking-wide">{t('inpatient.admissionsToday')}</p>
                <p className="text-heading-sm font-semibold text-obsidian mt-1">{dashboard?.admissionsToday ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-caption text-slate uppercase tracking-wide">{t('inpatient.dischargesToday')}</p>
                <p className="text-heading-sm font-semibold text-obsidian mt-1">{dashboard?.dischargesToday ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {selectedWard && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{selectedWardName} — {t('inpatient.bedMap')}</CardTitle>
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
                  <CardTitle>{t('inpatient.dailyRounds')} — {today}</CardTitle>
                  <Button size="sm" onClick={() => setShowRoundForm(true)}>{t('inpatient.addRound')}</Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedWard && (
                  <div className="mb-4">
                    <p className="text-caption text-slate uppercase tracking-wide mb-2">{t('inpatient.admittedPatients')}</p>
                    {patientsLoading ? (
                      <p className="text-caption text-slate">{t('inpatient.loadingPatients')}</p>
                    ) : wardPatients.length === 0 ? (
                      <p className="text-caption text-slate italic">{t('inpatient.noAdmitted')}</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {wardPatients.map((p) => (
                          <button
                            key={p.id}
                            className={`w-full text-left rounded-lg border p-3 transition-colors ${
                              selectedRoundPatient?.id === p.id
                                ? 'border-lilac-bloom bg-lilac-bloom/10'
                                : 'border-silver hover:bg-bone/50'
                            }`}
                            onClick={() => setSelectedRoundPatient(selectedRoundPatient?.id === p.id ? null : p)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-body font-medium text-obsidian">{p.patient?.fullName || 'Unknown'}</span>
                              <span className="text-caption text-slate">Bed {p.bedNumber}</span>
                            </div>
                            <div className="flex gap-3 text-caption text-slate mt-1">
                              <span>MRN: {p.patient?.mrn || '-'}</span>
                              {p.assignedAt && <span>Since: {new Date(p.assignedAt).toLocaleDateString()}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {rounds.length === 0 && <p className="text-caption text-slate text-center py-4">{t('inpatient.noRoundsToday')}</p>}
                  {rounds.map((r) => (
                    <div key={r.id} className="rounded-lg border border-silver p-3">
                      <p className="text-caption text-slate">Dr. {r.doctor?.fullName} &middot; {new Date(r.date).toLocaleString()}</p>
                      {r.notes && <p className="text-body text-obsidian mt-1 whitespace-pre-wrap">{r.notes}</p>}
                      {r.plan && (
                        <div className="mt-2 pt-2 border-t border-silver/50">
                          <p className="text-caption text-slate font-medium">{t('inpatient.planLabel')}</p>
                          <p className="text-body text-obsidian whitespace-pre-wrap">{r.plan}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                          {tab === 'vitals' ? t('inpatient.tabVitals') : t('inpatient.tabNursingNotes')}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {activeTab === 'vitals' && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{t('inpatient.vitalSigns')}</CardTitle>
                        <Button size="sm" onClick={() => setShowVitalForm(true)}>{t('inpatient.recordVitals')}</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                      {vitals.length === 0 && <p className="text-caption text-slate text-center py-4">{t('inpatient.noVitals')}</p>}
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
                        <CardTitle>{t('inpatient.nursingNotes')}</CardTitle>
                        <Button size="sm" onClick={() => setShowNoteForm(true)}>{t('inpatient.addNote')}</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                      {nursingNotes.length === 0 && <p className="text-caption text-slate text-center py-4">{t('inpatient.noNotes')}</p>}
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
                  <p className="text-body text-slate text-center py-8">{t('inpatient.selectBedPrompt')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {selectedBed && selectedBed.patient && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            const latestVital = vitals.length > 0 ? vitals[0] : null;
            const vitalsHtml = latestVital ? `
              <table style="width:100%; border-collapse:collapse; margin-top:0.5cm;">
                <tr><th style="border:1px solid #333; padding:4px 8px; background:#f0f0f0;">Parameter</th><th style="border:1px solid #333; padding:4px 8px; background:#f0f0f0;">Value</th></tr>
                ${latestVital.temperature !== null ? `<tr><td style="border:1px solid #333; padding:4px 8px;">Temperature</td><td style="border:1px solid #333; padding:4px 8px;">${Number(latestVital.temperature).toFixed(1)}°C</td></tr>` : ''}
                ${latestVital.heartRate !== null ? `<tr><td style="border:1px solid #333; padding:4px 8px;">Heart Rate</td><td style="border:1px solid #333; padding:4px 8px;">${latestVital.heartRate} bpm</td></tr>` : ''}
                ${latestVital.bloodPressureSystolic !== null ? `<tr><td style="border:1px solid #333; padding:4px 8px;">Blood Pressure</td><td style="border:1px solid #333; padding:4px 8px;">${latestVital.bloodPressureSystolic}/${latestVital.bloodPressureDiastolic || '?'} mmHg</td></tr>` : ''}
                ${latestVital.respiratoryRate !== null ? `<tr><td style="border:1px solid #333; padding:4px 8px;">Resp. Rate</td><td style="border:1px solid #333; padding:4px 8px;">${latestVital.respiratoryRate} /min</td></tr>` : ''}
                ${latestVital.oxygenSaturation !== null ? `<tr><td style="border:1px solid #333; padding:4px 8px;">SpO₂</td><td style="border:1px solid #333; padding:4px 8px;">${latestVital.oxygenSaturation}%</td></tr>` : ''}
                ${latestVital.painScore !== null ? `<tr><td style="border:1px solid #333; padding:4px 8px;">Pain Score</td><td style="border:1px solid #333; padding:4px 8px;">${latestVital.painScore}/10</td></tr>` : ''}
                <tr><td style="border:1px solid #333; padding:4px 8px;">Recorded</td><td style="border:1px solid #333; padding:4px 8px;">${new Date(latestVital.recordedAt).toLocaleString()} — ${latestVital.recordedBy?.fullName || '-'}</td></tr>
              </table>` : '<p>No vitals recorded yet.</p>';
            const notesHtml = nursingNotes.length > 0 ? nursingNotes.map((n) => `<div style="border-bottom:1px solid #ccc; padding:4px 0;"><strong>${new Date(n.createdAt).toLocaleString()} — ${n.createdBy?.fullName || ''}</strong><br/>${n.content}</div>`).join('') : '<p>No nursing notes.</p>';
            printWindow.document.write(`
              <html><head><title>Admission Summary</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 2cm; font-size: 12pt; }
                h1 { font-size: 18pt; margin-bottom: 0.5cm; }
                h2 { font-size: 14pt; margin-top: 1cm; border-bottom: 1px solid #999; padding-bottom: 0.2cm; }
                .header { text-align: center; margin-bottom: 1cm; border-bottom: 2px solid #333; padding-bottom: 0.5cm; }
                .field { margin: 0.3cm 0; }
                .field label { font-weight: bold; display: inline-block; min-width: 5cm; }
                .footer { margin-top: 2cm; font-size: 10pt; color: #666; border-top: 1px solid #999; padding-top: 0.5cm; text-align: center; }
              </style></head><body>
                <div class="header"><h1>Admission Summary</h1></div>
                <div class="field"><label>Patient:</label> ${selectedBed.patient.fullName || '-'}</div>
                <div class="field"><label>MRN:</label> ${selectedBed.patient.mrn || '-'}</div>
                <div class="field"><label>Ward:</label> ${selectedWardName}</div>
                <div class="field"><label>Bed:</label> ${selectedBed.bedNumber}</div>
                <div class="field"><label>Admitted:</label> ${selectedBed.assignedAt ? new Date(selectedBed.assignedAt).toLocaleString() : '-'}</div>
                <div class="field"><label>Date Printed:</label> ${new Date().toLocaleString()}</div>
                <h2>Latest Vital Signs</h2>
                ${vitalsHtml}
                <h2>Nursing Notes</h2>
                ${notesHtml}
                <div class="footer">HMS — Admission Summary</div>
              </body></html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }}><Printer size={14} className="mr-1" /> Print Admission Summary</Button>
        </div>
      )}

      <Modal open={showVitalForm} onClose={() => setShowVitalForm(false)} title={t('inpatient.recordVitalSigns')}>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'temperature', label: t('inpatient.temperature'), type: 'number', step: '0.1' },
            { key: 'heartRate', label: t('inpatient.heartRate'), type: 'number' },
            { key: 'bloodPressureSystolic', label: t('inpatient.bpSystolic'), type: 'number' },
            { key: 'bloodPressureDiastolic', label: t('inpatient.bpDiastolic'), type: 'number' },
            { key: 'respiratoryRate', label: t('inpatient.respiratoryRate'), type: 'number' },
            { key: 'oxygenSaturation', label: t('inpatient.oxygenSaturation'), type: 'number' },
            { key: 'painScore', label: t('inpatient.painScore'), type: 'number', min: 0, max: 10 },
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
            <label className="block text-sm font-medium text-graphite mb-1">{t('inpatient.notesLabel')}</label>
            <textarea
              value={vitalInputs.notes}
              onChange={(e) => setVitalInputs({ ...vitalInputs, notes: e.target.value })}
              className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={2}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => setShowVitalForm(false)} className="flex-1">{t('wards.cancel')}</Button>
          <Button onClick={handleRecordVital} className="flex-1" loading={vitalForm.isPending}>{t('inpatient.recordVitals')}</Button>
        </div>
      </Modal>

      <Modal open={showNoteForm} onClose={() => setShowNoteForm(false)} title={t('inpatient.addNursingNote')}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
          rows={4}
          placeholder={t('inpatient.nursingPlaceholder')}
        />
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => setShowNoteForm(false)} className="flex-1">{t('wards.cancel')}</Button>
          <Button onClick={handleAddNote} className="flex-1" loading={noteForm.isPending} disabled={!newNote.trim()}>{t('inpatient.addNoteButton')}</Button>
        </div>
      </Modal>

      <Modal open={showRoundForm} onClose={() => setShowRoundForm(false)} title={t('inpatient.recordDailyRound')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('inpatient.roundDate')}</label>
            <input
              type="date"
              value={roundDate}
              onChange={(e) => setRoundDate(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('inpatient.roundNotes')}</label>
            <textarea
              value={roundNotes}
              onChange={(e) => setRoundNotes(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              placeholder={t('inpatient.roundNotesPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('inpatient.roundPlan')}</label>
            <textarea
              value={roundPlan}
              onChange={(e) => setRoundPlan(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              placeholder={t('inpatient.roundPlanPlaceholder')}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => setShowRoundForm(false)} className="flex-1">{t('wards.cancel')}</Button>
          <Button onClick={handleAddRound} className="flex-1" loading={roundForm.isPending} disabled={!roundDate}>{t('inpatient.saveRound')}</Button>
        </div>
      </Modal>
    </div>
  );
}
