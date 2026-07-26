import { useState } from 'react';
import { usePatientSearch } from '../../hooks/usePatients';
import { useCreatePreopRequest, useOperationTypes } from '../../hooks/queries/usePreoperative';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PreopRequestForm({ open, onClose }) {
  const [departmentId, setDepartmentId] = useState('');
  const [operationTypeId, setOperationTypeId] = useState('');
  const [notes, setNotes] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, loading: searching, selectedPatient, selectPatient } = usePatientSearch();
  const { data: operationTypes = [] } = useOperationTypes(departmentId);
  const createRequest = useCreatePreopRequest();

  const fetchDepartments = async () => {
    if (departments.length > 0) return;
    setLoadingDepts(true);
    try {
      const data = await api.get('/departments');
      setDepartments(data);
    } catch {
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedPatient || !departmentId || !operationTypeId) {
      toast.error('Patient, department, and operation type are required');
      return;
    }
    createRequest.mutate(
      { patientId: selectedPatient.id, departmentId, operationTypeId, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success('Preoperative request created');
          handleClose();
        },
        onError: (err) => toast.error(err.message || 'Failed to create request'),
      }
    );
  };

  const handleClose = () => {
    selectPatient(null);
    setDepartmentId('');
    setOperationTypeId('');
    setNotes('');
    onClose();
  };

  const selectedDeptName = departments.find((d) => d.id === departmentId)?.name || '';
  const selectedOpName = operationTypes.find((ot) => ot.id === operationTypeId)?.name || '';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Preop Checklist</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2cm; font-size: 12pt; }
        h1 { font-size: 18pt; margin-bottom: 0.5cm; }
        .header { text-align: center; margin-bottom: 1cm; border-bottom: 2px solid #333; padding-bottom: 0.5cm; }
        .field { margin: 0.4cm 0; }
        .field label { font-weight: bold; display: inline-block; min-width: 5cm; }
        table { width: 100%; border-collapse: collapse; margin: 0.5cm 0; }
        th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
        th { background: #f0f0f0; }
        .footer { margin-top: 2cm; font-size: 10pt; color: #666; text-align: center; border-top: 1px solid #999; padding-top: 0.5cm; }
      </style></head><body>
        <div class="header">
          <h1>Preoperative Investigation Checklist</h1>
        </div>
        <div class="field"><label>Patient:</label> ${selectedPatient ? `${selectedPatient.fullName} (${selectedPatient.mrn})` : '_________________________'}</div>
        <div class="field"><label>Department:</label> ${selectedDeptName || '_________________________'}</div>
        <div class="field"><label>Operation Type:</label> ${selectedOpName || '_________________________'}</div>
        <div class="field"><label>Date:</label> ${new Date().toLocaleDateString()}</div>
        ${notes ? `<div class="field"><label>Notes:</label> ${notes}</div>` : ''}
        <h2>Checklist</h2>
        <table>
          <thead><tr><th style="width:5cm">Investigation</th><th style="width:3cm">Date Done</th><th style="width:2cm">Normal</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>Complete Blood Count (CBC)</td><td></td><td></td><td></td></tr>
            <tr><td>Blood Group & Cross-match</td><td></td><td></td><td></td></tr>
            <tr><td>Blood Glucose</td><td></td><td></td><td></td></tr>
            <tr><td>Kidney Function (Creatinine/Urea)</td><td></td><td></td><td></td></tr>
            <tr><td>Liver Function (ALT/AST)</td><td></td><td></td><td></td></tr>
            <tr><td>Coagulation Profile (PT/INR)</td><td></td><td></td><td></td></tr>
            <tr><td>Chest X-Ray</td><td></td><td></td><td></td></tr>
            <tr><td>ECG</td><td></td><td></td><td></td></tr>
            <tr><td>Urinalysis</td><td></td><td></td><td></td></tr>
            <tr><td>Hepatitis B/C</td><td></td><td></td><td></td></tr>
            <tr><td>HIV</td><td></td><td></td><td></td></tr>
            <tr><td>Pregnancy Test (if applicable)</td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
        <div class="footer">Prepared for nursing / OR staff</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Modal open={open} onClose={handleClose} title="New Preoperative Request">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-graphite mb-1">Patient</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between px-3 py-2 bg-lilac-bloom/10 border border-lilac-bloom rounded-lg">
              <span className="text-body font-medium text-obsidian">{selectedPatient.fullName} ({selectedPatient.mrn})</span>
              <button type="button" onClick={() => selectPatient(null)} className="text-caption text-slate hover:text-obsidian">&times;</button>
            </div>
          ) : (
            <>
              <input
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or MRN..."
              />
              {searching && (
                <p className="text-caption text-slate mt-1 flex items-center gap-2">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Searching...
                </p>
              )}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-silver rounded-lg divide-y divide-silver max-h-40 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-body hover:bg-bone transition-colors"
                      onClick={() => selectPatient(p)}
                    >
                      <span className="font-medium text-obsidian">{p.fullName}</span>
                      <span className="text-caption text-slate ml-2">{p.mrn}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-graphite mb-1">Department</label>
          <select
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setOperationTypeId(''); }}
            onFocus={fetchDepartments}
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          >
            <option value="">{loadingDepts ? 'Loading...' : 'Select department...'}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {departmentId && (
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Operation Type</label>
            <select
              value={operationTypeId}
              onChange={(e) => setOperationTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            >
              <option value="">Select operation type...</option>
              {operationTypes.map((ot) => (
                <option key={ot.id} value={ot.id}>{ot.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-graphite mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
            rows={3}
            placeholder="Clinical notes, special requirements..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={handlePrint}>
            <Printer size={14} className="mr-1" /> Print Checklist
          </Button>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            loading={createRequest.isPending}
            disabled={!selectedPatient || !departmentId || !operationTypeId}
          >
            Create Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
