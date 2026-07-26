import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { notifySuccess, notifyError } from '../../utils/notify';

export default function ImagingOrderModal({ isOpen, onClose, clinicSlug, patientId, patientName, onOrderCreated }) {
  const [scanType, setScanType] = useState('');
  const [laterality, setLaterality] = useState('');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [procedureTypeId, setProcedureTypeId] = useState('');
  const [procedureTypes, setProcedureTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    api.get('/admin/pricing/imaging-procedure-types')
      .then(setProcedureTypes)
      .catch(() => setProcedureTypes([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setScanType('');
      setLaterality('');
      setClinicalInfo('');
      setProcedureTypeId('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!scanType) return;
    setSubmitting(true);
    try {
      await api.post(`/clinics/${clinicSlug}/imaging-order`, {
        patientId,
        scanType,
        laterality: laterality || null,
        clinicalInfo: clinicalInfo || null,
        procedureTypeId: procedureTypeId || null,
      });
      notifySuccess('Imaging order created');
      onOrderCreated?.();
      onClose();
    } catch (err) {
      notifyError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={`Order Imaging — ${patientName || ''}`}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Scan Type</label>
          <select
            value={scanType}
            onChange={(e) => setScanType(e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          >
            <option value="">Select scan type</option>
            <option value="A_SCAN">A-Scan</option>
            <option value="B_SCAN">B-Scan</option>
            <option value="OTT">OCT</option>
            <option value="BIOMETRY">Biometry</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Laterality</label>
          <select
            value={laterality}
            onChange={(e) => setLaterality(e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          >
            <option value="">Select</option>
            <option value="Left">Left (OS)</option>
            <option value="Right">Right (OD)</option>
            <option value="Both">Both (OU)</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Procedure Type</label>
          <select
            value={procedureTypeId}
            onChange={(e) => setProcedureTypeId(e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          >
            <option value="">Select procedure type</option>
            {procedureTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>{pt.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Clinical Information</label>
          <textarea
            value={clinicalInfo}
            onChange={(e) => setClinicalInfo(e.target.value)}
            placeholder="Relevant clinical history, indication for imaging..."
            className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={!scanType}>
            Create Imaging Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}
