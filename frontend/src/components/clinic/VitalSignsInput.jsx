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

export const abnormalThresholds = {
  bloodPressureSystolic: { check: (v) => v > 140, label: 'BP High', severity: 'warning' },
  bloodPressureDiastolic: { check: (v) => v > 90, label: 'BP Diastolic High', severity: 'warning' },
  heartRate: { check: (v) => v > 100 || v < 60, label: 'HR Abnormal', severity: 'warning' },
  temperature: { check: (v) => v > 38.3, label: 'Fever', severity: 'critical' },
  spo2: { check: (v) => v < 95, label: 'Low SpO2', severity: 'critical' },
  bloodGlucose: { check: (v) => v > 180, label: 'High Glucose', severity: 'critical' },
};

export function getAbnormalStatus(key, value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  const threshold = abnormalThresholds[key];
  if (!threshold) return null;
  if (threshold.check(num)) return { type: threshold.severity, label: threshold.label };
  return null;
}

export function getAbnormalVitals(values) {
  const abnormal = [];
  for (const [key, config] of Object.entries(abnormalThresholds)) {
    const status = getAbnormalStatus(key, values?.[key]);
    if (status) abnormal.push({ key, ...config, ...status });
  }
  return abnormal;
}

export default function VitalSignsInput({ values, onChange }) {
  const handleChange = (key, val) => {
    onChange({ ...values, [key]: val === '' ? null : val });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {vitalsConfig.map((v) => {
        const status = getAbnormalStatus(v.key, values?.[v.key]);
        return (
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
            {status && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${
                status.type === 'critical'
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {status.type === 'critical' ? '⚠' : '!'} {status.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
