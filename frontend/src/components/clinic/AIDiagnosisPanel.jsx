import { Button } from '../ui/Button';

export default function AIDiagnosisPanel({
  diagnoses,
  tests,
  treatments,
  aiNotes,
  loading,
  error,
  onGetSuggestions,
  onApplyDiagnosis,
  onApplyAll,
  disabled,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-graphite">AI Diagnosis Assistant</p>
        <div className="relative group">
          <Button
            variant="secondary"
            size="sm"
            onClick={onGetSuggestions}
            disabled={disabled || loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4z" />
                  <path d="M12 17v3" />
                  <path d="M8 22h8" />
                </svg>
                Get AI Suggestions
              </span>
            )}
          </Button>
          {disabled && !loading && (
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
              <div className="bg-graphite text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
                Select a patient first
                <div className="absolute right-4 -top-1 w-2 h-2 bg-graphite rotate-45" />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3">
          <p className="text-caption text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {diagnoses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-graphite">Suggested Diagnoses</p>
          {diagnoses.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-bone rounded-lg px-4 py-3 cursor-pointer hover:bg-lilac-bloom/20 transition-colors"
              onClick={() => onApplyDiagnosis?.(d)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-obsidian">{d.name}</span>
                  {d.icd10 && <span className="text-caption text-slate">{d.icd10}</span>}
                </div>
                {d.rationale && (
                  <p className="text-caption text-graphite mt-0.5">{d.rationale}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3">
                <div className="w-16 bg-silver/50 rounded-full h-2">
                  <div
                    className="bg-lilac-bloom h-2 rounded-full"
                    style={{ width: `${d.confidence}%` }}
                  />
                </div>
                <span className="text-caption font-medium text-graphite min-w-[3ch]">{d.confidence}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tests.length > 0 && (
        <div>
          <p className="text-sm font-medium text-graphite mb-2">Recommended Tests</p>
          <div className="flex flex-wrap gap-2">
            {tests.map((t, i) => (
              <span key={i} className="text-xs bg-paper border border-silver rounded-full px-3 py-1 text-obsidian">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {treatments.length > 0 && (
        <div>
          <p className="text-sm font-medium text-graphite mb-2">Suggested Treatments</p>
          <div className="space-y-1.5">
            {treatments.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-obsidian">
                <span className="w-1.5 h-1.5 rounded-full bg-lilac-bloom shrink-0" />
                <span className="font-medium">{t.medication}</span>
                {t.dosage && <span className="text-slate">{t.dosage}</span>}
                {t.duration && <span className="text-slate">· {t.duration}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(diagnoses.length > 0 || treatments.length > 0) && onApplyAll && (
        <Button variant="secondary" size="sm" onClick={onApplyAll} className="w-full">
          Apply All Suggestions to Form
        </Button>
      )}

      {aiNotes && (
        <div className="bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3">
          <p className="text-caption text-amber-800 dark:text-amber-200">{aiNotes}</p>
        </div>
      )}
    </div>
  );
}
