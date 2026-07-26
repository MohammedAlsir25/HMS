import { useState } from 'react';
import { useFhirSearch } from '../../hooks/queries/useFhir';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const RESOURCE_TYPES = [
  'Patient', 'Encounter', 'Observation', 'Condition', 'MedicationRequest',
  'ServiceRequest', 'DiagnosticReport', 'Appointment', 'Procedure',
  'Coverage', 'Claim', 'Location', 'Practitioner', 'DocumentReference',
];

const SEARCH_PARAMS = {
  Patient: ['name', 'birthdate', 'identifier', 'gender'],
  Encounter: ['patient', 'date', 'type'],
  Observation: ['patient', 'code'],
  Condition: ['patient'],
  MedicationRequest: ['patient'],
  ServiceRequest: ['patient'],
  DiagnosticReport: ['patient'],
  Appointment: ['patient', 'status'],
  Procedure: ['patient'],
  Coverage: ['patient'],
  Claim: ['patient', 'status'],
  Location: [],
  Practitioner: ['name'],
  DocumentReference: ['patient'],
};

function JsonHighlight({ data }) {
  if (!data) return null;
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <pre className="bg-obsidian text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-[600px] overflow-y-auto">
      <code>{json}</code>
    </pre>
  );
}

export default function FhirExplorer() {
  const [resourceType, setResourceType] = useState('Patient');
  const [params, setParams] = useState({});
  const [queryEnabled, setQueryEnabled] = useState(false);

  const { data, isLoading, isError, error, refetch } = useFhirSearch(resourceType, params, queryEnabled);

  const currentParams = SEARCH_PARAMS[resourceType] || [];

  const handleResourceChange = (e) => {
    setResourceType(e.target.value);
    setParams({});
    setQueryEnabled(false);
  };

  const handleParamChange = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleExecute = () => {
    setQueryEnabled(true);
    refetch();
  };

  const bundleTotal = data?.total ?? (Array.isArray(data?.entry) ? data.entry.length : null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-sm font-semibold text-obsidian">FHIR Endpoint Explorer</h1>
        <p className="text-body text-slate mt-1">Browse and query FHIR R4 resources from connected endpoints</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Query Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-graphite">Resource Type</label>
              <select
                value={resourceType}
                onChange={handleResourceChange}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1"
              >
                {RESOURCE_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>

            {currentParams.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {currentParams.map((p) => (
                  <Input
                    key={p}
                    label={p}
                    value={params[p] || ''}
                    onChange={(e) => handleParamChange(p, e.target.value)}
                    placeholder={p}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={handleExecute} loading={isLoading}>Execute</Button>
              <span className="text-caption text-slate">GET /fhir/R4/{resourceType}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Response</CardTitle>
            {bundleTotal != null && (
              <span className="text-caption text-slate">Total: {bundleTotal}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Error</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error?.message || 'Request failed'}</p>
              {data?.resourceType === 'OperationOutcome' && (
                <div className="mt-2">
                  <JsonHighlight data={data} />
                </div>
              )}
            </div>
          ) : data ? (
            <JsonHighlight data={data} />
          ) : (
            <p className="text-body text-slate text-center py-8">Execute a query to see results</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
