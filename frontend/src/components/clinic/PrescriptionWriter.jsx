import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import DrugNameAutocomplete from './DrugNameAutocomplete';

export default function PrescriptionWriter({ medications = [], onChange, clinicSlug }) {
  const addMedication = () => {
    onChange([...medications, { drugName: '', dosage: '', frequency: '', duration: '', route: 'oral', notes: '' }]);
  };

  const updateMedication = (idx, field, value) => {
    const updated = medications.map((m, i) => (i === idx ? { ...m, [field]: value } : m));
    onChange(updated);
  };

  const removeMedication = (idx) => {
    onChange(medications.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {medications.map((med, idx) => (
        <div key={idx} className="bg-bone rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-graphite">Medication #{idx + 1}</span>
            <button
              onClick={() => removeMedication(idx)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-400 text-caption touch-target"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <DrugNameAutocomplete
              value={med.drugName}
              onChange={(v) => updateMedication(idx, 'drugName', v)}
              clinicSlug={clinicSlug}
            />
            <Input
              label="Dosage"
              placeholder="e.g. 5mg"
              value={med.dosage}
              onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
            />
            <Input
              label="Frequency"
              placeholder="e.g. Once daily"
              value={med.frequency}
              onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
            />
            <Input
              label="Duration"
              placeholder="e.g. 14 days"
              value={med.duration}
              onChange={(e) => updateMedication(idx, 'duration', e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-graphite">Route</label>
              <select
                value={med.route}
                onChange={(e) => updateMedication(idx, 'route', e.target.value)}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              >
                <option value="oral">Oral</option>
                <option value="topical">Topical</option>
                <option value="intravenous">IV</option>
                <option value="intramuscular">IM</option>
                <option value="subcutaneous">Subcutaneous</option>
                <option value="inhalation">Inhalation</option>
              </select>
            </div>
            <Input
              label="Notes"
              placeholder="Special instructions"
              value={med.notes}
              onChange={(e) => updateMedication(idx, 'notes', e.target.value)}
            />
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addMedication}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="mr-1">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add Medication
      </Button>
    </div>
  );
}
