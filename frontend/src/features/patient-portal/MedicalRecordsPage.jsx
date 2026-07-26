import { useState, useEffect } from 'react';
import { Stethoscope, FlaskConical, Pill, Scan } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { portalApi } from './hooks/usePortalApi';

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'lab', label: 'Lab' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'imaging', label: 'Imaging' },
];

const typeIcons = {
  consultation: Stethoscope,
  lab: FlaskConical,
  prescription: Pill,
  imaging: Scan,
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MedicalRecordsPage() {
  const [filter, setFilter] = useState('all');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    async function load() {
      try {
        const [consultations, labResults, prescriptions, imaging] = await Promise.all([
          portalApi.getConsultations().catch(() => ({ consultations: [] })),
          portalApi.getLabResults().catch(() => ({ labResults: [] })),
          portalApi.getPrescriptions().catch(() => ({ prescriptions: [] })),
          portalApi.getImaging().catch(() => ({ imagingOrders: [] })),
        ]);
        if (cancelled) return;
        const all = [
          ...(consultations?.consultations || []).map((c) => ({
            ...c, type: 'consultation', date: c.encounterDate, title: c.diagnosis, id: c.id,
          })),
          ...(labResults?.labResults || []).map((l) => ({
            ...l, type: 'lab', date: l.completedAt || l.orderDate, title: `Lab - ${l.clinic}`, id: l.orderId,
          })),
          ...(prescriptions?.prescriptions || []).map((p) => ({
            ...p, type: 'prescription', date: p.prescribedDate, title: p.drugName, id: p.id,
          })),
          ...(imaging?.imagingOrders || []).map((im) => ({
            ...im, type: 'imaging', date: im.completedAt || im.orderDate, title: im.scanType, id: im.id,
          })),
        ];
        all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setRecords(all);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = filter === 'all' ? records : records.filter((r) => r.type === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-heading-sm font-semibold text-obsidian">Medical Records</h1>

      <div className="flex gap-2 overflow-x-auto">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-caption font-medium whitespace-nowrap transition-colors ${
              filter === f.key ? 'bg-lilac-bloom text-obsidian' : 'bg-white border border-silver text-graphite hover:bg-bone'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-body text-slate mt-3">Loading records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body text-slate">No records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const Icon = typeIcons[record.type] || Stethoscope;
            const isExpanded = expandedId === record.id;
            return (
              <Card key={record.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedId(isExpanded ? null : record.id)}>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-lilac-bloom/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-5 h-5 text-lilac-bloom" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-body font-medium text-obsidian truncate">{record.title}</h3>
                        <Badge variant="default" size="sm">{record.type}</Badge>
                      </div>
                      <p className="text-caption text-slate">{formatDate(record.date)}</p>
                      {isExpanded && (
                        <div className="mt-3 text-body text-graphite space-y-1 border-t border-silver pt-3">
                          {record.clinic && <p>Clinic: {record.clinic}</p>}
                          {record.doctor && <p>Doctor: {record.doctor}</p>}
                          {record.diagnosis && <p>Diagnosis: {record.diagnosis}</p>}
                          {record.notes && <p>Notes: {record.notes}</p>}
                          {record.status && <p>Status: {record.status}</p>}
                          {record.findings && <p>Findings: {record.findings}</p>}
                          {record.impression && <p>Impression: {record.impression}</p>}
                          {record.vitalSigns && (
                            <div className="mt-2">
                              <p className="font-medium text-obsidian">Vital Signs</p>
                              <div className="grid grid-cols-2 gap-1 text-caption">
                                {record.vitalSigns.bloodPressureSystolic && <span>BP: {record.vitalSigns.bloodPressureSystolic}/{record.vitalSigns.bloodPressureDiastolic}</span>}
                                {record.vitalSigns.heartRate && <span>HR: {record.vitalSigns.heartRate}</span>}
                                {record.vitalSigns.temperature && <span>Temp: {record.vitalSigns.temperature}</span>}
                                {record.vitalSigns.spo2 && <span>SpO2: {record.vitalSigns.spo2}%</span>}
                                {record.vitalSigns.weight && <span>Weight: {record.vitalSigns.weight}kg</span>}
                              </div>
                            </div>
                          )}
                          {record.medications?.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium text-obsidian">Medications</p>
                              {record.medications.map((m, i) => (
                                <p key={i} className="text-caption">{m.drugName} — {m.dosage} ({m.frequency})</p>
                              ))}
                            </div>
                          )}
                          {record.tests?.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium text-obsidian">Tests</p>
                              {record.tests.map((t, i) => (
                                <div key={i} className="flex items-center gap-2 text-caption">
                                  <span>{t.testName}: {t.value} {t.unit}</span>
                                  {t.isAbnormal && <Badge variant="danger" size="sm">{t.flag}</Badge>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
