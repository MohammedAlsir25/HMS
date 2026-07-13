import { useBedVitals, useBedNotes } from '../../hooks/queries/useWards';
import { Badge } from '../../components/ui/Badge';

export default function BedDetailPanel({ bed, onClose }) {
  const { data: vitals = [], isLoading: vitalsLoading } = useBedVitals(bed.id);
  const { data: notes = [], isLoading: notesLoading } = useBedNotes(bed.id);

  const formatDt = (v) => v ? new Date(v).toLocaleString() : '-';

  return (
    <div className="border border-silver rounded-lg bg-bone/30 p-4 mt-3 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-obsidian">
          Bed {bed.bedNumber} — {bed.patient?.fullName || 'Unknown'} ({bed.patient?.mrn || '-'})
        </h3>
        <button onClick={onClose} className="text-caption text-slate hover:text-obsidian">&times; Close</button>
      </div>

      <div>
        <h4 className="text-caption font-semibold text-graphite mb-2 uppercase tracking-wide">Vitals</h4>
        {vitalsLoading ? <p className="text-caption text-slate">Loading...</p> : vitals.length === 0 ? (
          <p className="text-caption text-slate italic">No vitals recorded</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {vitals.map((v) => (
              <div key={v.id} className="bg-paper rounded-lg p-3 border border-silver text-caption space-y-1">
                <div className="flex items-center gap-2 text-caption text-slate">
                  <span>{formatDt(v.recordedAt)}</span>
                  {v.recordedBy && <span>— {v.recordedBy.fullName}</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {v.temperature != null && <span><strong>Temp:</strong> {v.temperature}°C</span>}
                  {v.heartRate != null && <span><strong>HR:</strong> {v.heartRate} bpm</span>}
                  {v.bloodPressureSystolic != null && <span><strong>BP:</strong> {v.bloodPressureSystolic}/{v.bloodPressureDiastolic || '?'}</span>}
                  {v.respiratoryRate != null && <span><strong>RR:</strong> {v.respiratoryRate}</span>}
                  {v.oxygenSaturation != null && <span><strong>SpO2:</strong> {v.oxygenSaturation}%</span>}
                  {v.painScore != null && <span><strong>Pain:</strong> {v.painScore}/10</span>}
                </div>
                {v.notes && <p className="text-slate mt-1">{v.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-caption font-semibold text-graphite mb-2 uppercase tracking-wide">Nursing Notes</h4>
        {notesLoading ? <p className="text-caption text-slate">Loading...</p> : notes.length === 0 ? (
          <p className="text-caption text-slate italic">No nursing notes</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notes.map((n) => (
              <div key={n.id} className="bg-paper rounded-lg p-3 border border-silver text-caption space-y-1">
                <div className="flex items-center gap-2 text-caption text-slate">
                  <span>{formatDt(n.createdAt)}</span>
                  {n.createdBy && <span>— {n.createdBy.fullName}</span>}
                </div>
                <p className="text-obsidian">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}