import { useState } from 'react';
import { useRecordPreopWaiver } from '../../hooks/queries/usePreoperative';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const RELATIONSHIPS = [
  { value: 'SELF', label: 'Self' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'GUARDIAN', label: 'Guardian' },
];

export default function ConsentWaiverModal({ open, onClose, requestId }) {
  const [signedBy, setSignedBy] = useState('');
  const [relationship, setRelationship] = useState('SELF');
  const [witnessedById, setWitnessedById] = useState('');

  const recordWaiver = useRecordPreopWaiver();

  const handleSubmit = () => {
    if (!signedBy.trim()) {
      toast.error('Signed by is required');
      return;
    }
    recordWaiver.mutate(
      { id: requestId, signedBy: signedBy.trim(), relationship, witnessedById: witnessedById || undefined },
      {
        onSuccess: () => {
          toast.success('Consent waiver recorded');
          handleClose();
        },
        onError: (err) => toast.error(err.message || 'Failed to record waiver'),
      }
    );
  };

  const handleClose = () => {
    setSignedBy('');
    setRelationship('SELF');
    setWitnessedById('');
    onClose();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const relLabel = RELATIONSHIPS.find((r) => r.value === relationship)?.label || relationship;
    printWindow.document.write(`
      <html><head><title>Consent Form</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2cm; font-size: 12pt; }
        h1 { font-size: 18pt; margin-bottom: 0.5cm; }
        h2 { font-size: 14pt; margin-top: 1cm; }
        .header { text-align: center; margin-bottom: 1cm; border-bottom: 2px solid #333; padding-bottom: 0.5cm; }
        .field { margin: 0.4cm 0; }
        .field label { font-weight: bold; display: inline-block; min-width: 5cm; }
        .signature-area { margin-top: 2cm; border-top: 1px solid #999; padding-top: 0.5cm; }
        .sig-line { border-bottom: 1px solid #333; width: 8cm; display: inline-block; margin-top: 1.5cm; }
        .footer { margin-top: 2cm; font-size: 10pt; color: #666; text-align: center; }
      </style></head><body>
        <div class="header">
          <h1>Consent Waiver Form</h1>
          <p>Preoperative Consent</p>
        </div>
        <div class="field"><label>Signed By:</label> ${signedBy || '_________________________'}</div>
        <div class="field"><label>Relationship:</label> ${relLabel}</div>
        <div class="field"><label>Witness:</label> ${witnessedById || 'N/A'}</div>
        <div class="field"><label>Request ID:</label> ${requestId || '-'}</div>
        <div class="field"><label>Date:</label> ${new Date().toLocaleDateString()}</div>
        <div class="signature-area">
          <div style="display:flex; justify-content:space-between;">
            <div>
              <div class="sig-line"></div>
              <p style="font-size:10pt; margin-top:0.2cm;">Signature of Patient / Guardian</p>
            </div>
            <div>
              <div class="sig-line"></div>
              <p style="font-size:10pt; margin-top:0.2cm;">Signature of Witness</p>
            </div>
          </div>
        </div>
        <div class="footer">This is a legally binding consent document. Please sign and return to the hospital.</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Record Consent Waiver">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-graphite mb-1">Signed By</label>
          <input
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            value={signedBy}
            onChange={(e) => setSignedBy(e.target.value)}
            placeholder="Name of person signing the waiver"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-graphite mb-1">Relationship</label>
          <div className="flex gap-2">
            {RELATIONSHIPS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  relationship === r.value
                    ? 'bg-lilac-bloom text-paper border-lilac-bloom'
                    : 'bg-paper text-graphite border-silver hover:border-lilac-bloom/50'
                }`}
                onClick={() => setRelationship(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-graphite mb-1">Witness (optional)</label>
          <input
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            value={witnessedById}
            onChange={(e) => setWitnessedById(e.target.value)}
            placeholder="Witness name or ID"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={handlePrint}>
            <Printer size={14} className="mr-1" /> Print Form
          </Button>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            loading={recordWaiver.isPending}
            disabled={!signedBy.trim()}
          >
            Record Waiver
          </Button>
        </div>
      </div>
    </Modal>
  );
}
