import { useState } from 'react';
import { useFhirEndpoints, useCreateFhirEndpoint, useUpdateFhirEndpoint, useDeleteFhirEndpoint, useTestFhirEndpoint } from '../../hooks/queries/useFhir';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const AUTH_TYPES = [
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'apikey', label: 'API Key' },
  { value: 'none', label: 'None' },
];

const emptyForm = { name: '', baseUrl: '', authType: 'none', description: '' };

export default function IntegrationPage() {
  const { data: endpoints = [], isLoading, isError, refetch } = useFhirEndpoints();
  const createEndpoint = useCreateFhirEndpoint();
  const updateEndpoint = useUpdateFhirEndpoint();
  const deleteEndpoint = useDeleteFhirEndpoint();
  const testEndpoint = useTestFhirEndpoint();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);

  const handleOpenAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (ep) => {
    setEditing(ep);
    setForm({ name: ep.name || '', baseUrl: ep.baseUrl || '', authType: ep.authType || 'none', description: ep.description || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateEndpoint.mutateAsync({ id: editing.id, data: form });
        toast.success('Endpoint updated');
      } else {
        await createEndpoint.mutateAsync(form);
        toast.success('Endpoint created');
      }
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err.message || 'Failed to save endpoint');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ep) => {
    if (!confirm(`Delete endpoint "${ep.name}"? This cannot be undone.`)) return;
    try {
      await deleteEndpoint.mutateAsync(ep.id);
      toast.success('Endpoint deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete endpoint');
    }
  };

  const handleTest = async (ep) => {
    setTestingId(ep.id);
    try {
      const result = await testEndpoint.mutateAsync(ep.id);
      toast.success(result?.message || 'Connection successful');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const statusBadge = (ep) => {
    if (ep.lastError) return <Badge variant="danger">Error</Badge>;
    if (ep.isActive === false) return <Badge variant="warning">Inactive</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">FHIR Integrations</h1>
          <p className="text-body text-slate mt-1">Manage external FHIR R4 endpoints and connections</p>
        </div>
        <Button onClick={handleOpenAdd}>Add Endpoint</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FHIR Endpoints ({endpoints.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-body text-slate">Loading endpoints...</p>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <p className="text-body text-red-500">Failed to load endpoints</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          ) : endpoints.length === 0 ? (
            <p className="text-body text-slate py-8 text-center">No FHIR endpoints configured. Add one to get started.</p>
          ) : (
            <div className="space-y-4">
              {endpoints.map((ep) => (
                <div key={ep.id} className="p-4 border border-silver rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-obsidian">{ep.name}</span>
                      {statusBadge(ep)}
                      {ep.errorCount > 0 && (
                        <Badge variant="danger" size="sm">{ep.errorCount} errors</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(ep)}
                        loading={testingId === ep.id}
                      >
                        Test Connection
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(ep)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(ep)}>Delete</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-caption text-slate">
                    <span>URL: {ep.baseUrl}</span>
                    <span>Auth: {AUTH_TYPES.find((a) => a.value === ep.authType)?.label || ep.authType}</span>
                    {ep.lastSyncAt && <span>Last sync: {new Date(ep.lastSyncAt).toLocaleString()}</span>}
                    {ep.description && <span>{ep.description}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Endpoint' : 'Add Endpoint'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Main Hospital FHIR Server"
          />
          <Input
            label="Base URL"
            required
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            placeholder="https://example.com/fhir"
          />
          <div>
            <label className="text-sm font-medium text-graphite">Auth Type</label>
            <select
              value={form.authType}
              onChange={(e) => setForm({ ...form, authType: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1"
            >
              {AUTH_TYPES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>{editing ? 'Update' : 'Create'} Endpoint</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
