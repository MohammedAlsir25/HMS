import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import DrugNameAutocomplete from './DrugNameAutocomplete';

const frequencyOptions = [
  { value: '', label: 'Select frequency' },
  { value: 'Once daily', label: 'Once daily (OD)' },
  { value: 'Twice daily', label: 'Twice daily (BD)' },
  { value: 'Three times daily', label: 'Three times daily (TDS)' },
  { value: 'Four times daily', label: 'Four times daily (QID)' },
  { value: 'Every 8 hours', label: 'Every 8 hours (Q8H)' },
  { value: 'Every 12 hours', label: 'Every 12 hours (Q12H)' },
  { value: 'At bedtime', label: 'At bedtime (QHS)' },
  { value: 'As needed', label: 'As needed (PRN)' },
  { value: 'Once weekly', label: 'Once weekly' },
  { value: 'Stat', label: 'Stat (immediately)' },
];

const routeOptions = [
  { value: 'oral', label: 'Oral' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'topical', label: 'Topical' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
  { value: 'otic', label: 'Otic' },
  { value: 'nasal', label: 'Nasal' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'vaginal', label: 'Vaginal' },
  { value: 'intravenous', label: 'Intravenous (IV)' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'transdermal', label: 'Transdermal' },
];

const durationUnitOptions = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

function parseDuration(durationStr) {
  if (!durationStr) return { number: '', unit: 'days' };
  const match = String(durationStr).match(/^(\d+)\s*(days?|weeks?|months?)?$/i);
  if (match) {
    const unit = match[2] ? match[2].toLowerCase() : 'days';
    const normalizedUnit = unit.startsWith('day') ? 'days' : unit.startsWith('week') ? 'weeks' : 'months';
    return { number: match[1], unit: normalizedUnit };
  }
  return { number: durationStr, unit: 'days' };
}

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
      {medications.map((med, idx) => {
        const parsed = parseDuration(med.duration);
        return (
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
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-graphite">Frequency</label>
                <select
                  value={med.frequency}
                  onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                >
                  {frequencyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-graphite">Duration</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0"
                    placeholder="Qty"
                    value={parsed.number}
                    onChange={(e) => updateMedication(idx, 'duration', e.target.value ? `${e.target.value} ${parsed.unit}` : '')}
                    className="w-20 px-3 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  />
                  <select
                    value={parsed.unit}
                    onChange={(e) => updateMedication(idx, 'duration', parsed.number ? `${parsed.number} ${e.target.value}` : '')}
                    className="flex-1 px-3 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  >
                    {durationUnitOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-graphite">Route</label>
                <select
                  value={med.route}
                  onChange={(e) => updateMedication(idx, 'route', e.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                >
                  {routeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
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
        );
      })}
      <Button variant="ghost" size="sm" onClick={addMedication}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="mr-1">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add Medication
      </Button>
    </div>
  );
}
