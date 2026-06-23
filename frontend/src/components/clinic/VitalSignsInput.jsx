import { Input } from '../ui/Input';

const vitalsConfig = [
  { key: 'bloodPressureSystolic', label: 'BP Systolic', placeholder: '120', suffix: 'mmHg' },
  { key: 'bloodPressureDiastolic', label: 'BP Diastolic', placeholder: '80', suffix: 'mmHg' },
  { key: 'heartRate', label: 'Heart Rate', placeholder: '72', suffix: 'bpm', type: 'number' },
  { key: 'temperature', label: 'Temperature', placeholder: '36.5', suffix: '°C', type: 'number', step: '0.1' },
  { key: 'spo2', label: 'SpO2', placeholder: '98', suffix: '%', type: 'number' },
  { key: 'bloodGlucose', label: 'Blood Glucose', placeholder: '100', suffix: 'mg/dL', type: 'number' },
  { key: 'weight', label: 'Weight', placeholder: '70', suffix: 'kg', type: 'number', step: '0.1' },
];

export default function VitalSignsInput({ values, onChange }) {
  const handleChange = (key, val) => {
    onChange({ ...values, [key]: val === '' ? null : val });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {vitalsConfig.map((v) => (
        <div key={v.key} className="relative">
          <Input
            label={v.label}
            placeholder={v.placeholder}
            type={v.type || 'text'}
            step={v.step}
            value={values?.[v.key] ?? ''}
            onChange={(e) => handleChange(v.key, e.target.value)}
          />
          {v.suffix && (
            <span className="absolute right-3 bottom-3 text-caption text-slate pointer-events-none">
              {v.suffix}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
