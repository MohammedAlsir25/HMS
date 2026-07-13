import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurgeryDischarge, useCreateDischargeSummary, useSurgeries } from '../../hooks/queries/useSurgery';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function DischargeSummaryPage() {
  const { surgeryId } = useParams();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useSurgeryDischarge(surgeryId);
  const createSummary = useCreateDischargeSummary();

  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().slice(0, 10));
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [medications, setMedications] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');

  const handleSubmit = () => {
    if (!dischargeDate) { toast.error('Discharge date required'); return; }
    createSummary.mutate(
      { surgeryId, dischargeDate, dischargeNotes, medications, followUpInstructions },
      {
        onSuccess: () => toast.success('Discharge summary saved'),
        onError: (err) => toast.error(err.message || 'Failed to save'),
      }
    );
  };

  if (isLoading) {
    return <Card><CardContent><p className="text-body text-slate text-center py-8">Loading...</p></CardContent></Card>;
  }

  if (summary) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-sm font-semibold text-obsidian">Discharge Summary</h1>
            <p className="text-body text-slate mt-1">View discharge summary</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/surgery')}>Back to Surgery</Button>
        </div>
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-caption text-slate">Discharge Date</p>
                <p className="text-body font-medium text-obsidian">{new Date(summary.dischargeDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-caption text-slate">Created By</p>
                <p className="text-body font-medium text-obsidian">{summary.createdBy?.fullName || '-'}</p>
              </div>
            </div>
            {summary.dischargeNotes && (
              <div>
                <p className="text-caption text-slate">Notes</p>
                <p className="text-body text-obsidian whitespace-pre-wrap">{summary.dischargeNotes}</p>
              </div>
            )}
            {summary.medications && (
              <div>
                <p className="text-caption text-slate">Medications</p>
                <p className="text-body text-obsidian whitespace-pre-wrap">{summary.medications}</p>
              </div>
            )}
            {summary.followUpInstructions && (
              <div>
                <p className="text-caption text-slate">Follow-up Instructions</p>
                <p className="text-body text-obsidian whitespace-pre-wrap">{summary.followUpInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Create Discharge Summary</h1>
          <p className="text-body text-slate mt-1">Post-operative discharge for surgery #{surgeryId?.slice(-4)}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/surgery')}>Back to Surgery</Button>
      </div>
      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Discharge Date</label>
            <input
              type="date"
              value={dischargeDate}
              onChange={(e) => setDischargeDate(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Discharge Notes</label>
            <textarea
              value={dischargeNotes}
              onChange={(e) => setDischargeNotes(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={4}
              placeholder="Post-operative condition, wound status, vital signs..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Prescribed Medications</label>
            <textarea
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              placeholder="List of medications with dosage and frequency..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Follow-up Instructions</label>
            <textarea
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              placeholder="Follow-up appointment, wound care, activity restrictions..."
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            loading={createSummary.isPending}
            disabled={!dischargeDate}
          >
            Save Discharge Summary
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
