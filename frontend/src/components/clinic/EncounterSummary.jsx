import { useState } from 'react';
import { Button } from '../ui/Button';

export default function EncounterSummary({
  patient, vitals, symptoms, diagnosis, diagnosisIcd10, medications, soapNotes,
  labOrders, imagingOrders, referrals,
  onClose, layout: initialLayout = 'a4',
}) {
  const [layout, setLayout] = useState(initialLayout);

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    const isThermal = layout === 'thermal';

    const a4Styles = `
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
      h1 { color: #1a1a2e; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; font-size: 20px; }
      h2 { color: #4a4a6a; font-size: 14px; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .field { margin-bottom: 6px; }
      .label { font-size: 11px; color: #888; text-transform: uppercase; }
      .value { font-size: 14px; color: #1a1a2e; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #f5f3ff; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; color: #4a4a6a; }
      td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
      .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
      .note { background: #f9f9f9; padding: 12px; border-radius: 6px; font-size: 13px; white-space: pre-wrap; margin-top: 4px; }
      @media print { body { padding: 20px; } .no-print { display: none; } }
    `;

    const thermalStyles = `
      body { font-family: Arial, sans-serif; width: 80mm; margin: 0; padding: 4mm; font-size: 10px; color: #000; }
      h1 { font-size: 12px; text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
      h2 { font-size: 10px; margin-top: 8px; margin-bottom: 4px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
      .field { margin-bottom: 2px; }
      .label { font-size: 8px; color: #666; }
      .value { font-size: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 4px; }
      th { font-size: 8px; text-align: left; padding: 2px; border-bottom: 1px solid #000; }
      td { font-size: 9px; padding: 2px; border-bottom: 1px solid #eee; }
      .footer { margin-top: 16px; font-size: 8px; color: #888; text-align: center; border-top: 1px solid #000; padding-top: 4px; }
      .note { padding: 4px; font-size: 9px; white-space: pre-wrap; margin-top: 2px; }
    `;

    const styles = isThermal ? thermalStyles : a4Styles;

    const labSection = labOrders?.length > 0 ? `
      <h2>Lab Orders</h2>
      <table>
        <tr><th>Test</th><th>Status</th><th>Priority</th></tr>
        ${labOrders.map((order) =>
          (order.tests || []).map((test) =>
            `<tr><td>${test.test?.name || '-'}</td><td>${order.status}</td><td>${order.priority > 0 ? 'Urgent' : 'Routine'}</td></tr>`
          ).join('')
        ).join('')}
      </table>
    ` : '';

    const imagingSection = imagingOrders?.length > 0 ? `
      <h2>Imaging Orders</h2>
      <table>
        <tr><th>Scan Type</th><th>Laterality</th><th>Status</th></tr>
        ${imagingOrders.map((order) =>
          `<tr><td>${order.scanType}</td><td>${order.laterality || '-'}</td><td>${order.status}</td></tr>`
        ).join('')}
      </table>
    ` : '';

    const referralSection = referrals?.length > 0 ? `
      <h2>Referrals</h2>
      <table>
        <tr><th>Type</th><th>To</th><th>Status</th><th>Notes</th></tr>
        ${referrals.map((r) =>
          `<tr><td>${(r.type || '').replace(/_/g, ' ')}</td><td>${r.toClinic?.name || '-'}</td><td>${r.status}</td><td>${r.notes || '-'}</td></tr>`
        ).join('')}
      </table>
    ` : '';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Encounter Summary - ${patient?.fullName || 'Patient'}</title>
        <style>${styles}</style>
      </head>
      <body>
        <h1>Encounter Summary</h1>
        <div class="grid">
          <div class="field"><div class="label">Patient Name</div><div class="value">${patient?.fullName || '-'}</div></div>
          <div class="field"><div class="label">MRN</div><div class="value">${patient?.mrn || '-'}</div></div>
          <div class="field"><div class="label">Gender</div><div class="value">${patient?.gender || '-'}</div></div>
          <div class="field"><div class="label">Date</div><div class="value">${new Date().toLocaleDateString()}</div></div>
        </div>

        <h2>Vital Signs</h2>
        <div class="grid">
          ${vitals ? Object.entries(vitals).filter(([_, v]) => v).map(([key, val]) =>
            `<div class="field"><div class="label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div><div class="value">${val}</div></div>`
          ).join('') : '<div class="field"><div class="value">No vitals recorded</div></div>'}
        </div>

        <h2>Symptoms</h2>
        ${symptoms?.length > 0 ? `
        <table>
          <tr><th>Symptom</th><th>Area</th><th>Onset</th><th>Severity</th></tr>
          ${symptoms.filter((s) => s.name).map((s) =>
            `<tr><td>${s.name}</td><td>${s.bodyArea || '-'}</td><td>${s.onset || '-'}</td><td>${s.severity || '-'}/10</td></tr>`
          ).join('')}
        </table>` : '<div class="value">No symptoms recorded</div>'}

        <h2>Diagnosis</h2>
        <div class="value">${diagnosis || '-'}${diagnosisIcd10 ? ` (ICD-10: ${diagnosisIcd10})` : ''}</div>

        <h2>Prescriptions</h2>
        ${medications?.length > 0 ? `
        <table>
          <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Route</th></tr>
          ${medications.filter((m) => m.drugName).map((m) =>
            `<tr><td>${m.drugName}</td><td>${m.dosage || '-'}</td><td>${m.frequency || '-'}</td><td>${m.duration || '-'}</td><td>${m.route || '-'}</td></tr>`
          ).join('')}
        </table>` : '<div class="value">No medications prescribed</div>'}

        ${labSection}
        ${imagingSection}
        ${referralSection}

        <h2>SOAP Notes</h2>
        ${soapNotes?.subjective ? `<div class="note"><strong>Subjective:</strong> ${soapNotes.subjective}</div>` : ''}
        ${soapNotes?.objective ? `<div class="note"><strong>Objective:</strong> ${soapNotes.objective}</div>` : ''}
        ${soapNotes?.assessment ? `<div class="note"><strong>Assessment:</strong> ${soapNotes.assessment}</div>` : ''}
        ${soapNotes?.plan ? `<div class="note"><strong>Plan:</strong> ${soapNotes.plan}</div>` : ''}

        <div class="footer">Generated by Al Jawarih HMS on ${new Date().toLocaleString()}</div>
        <script>window.print();window.close();</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-paper rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-obsidian">Encounter Summary</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLayout(layout === 'a4' ? 'thermal' : 'a4')}>
                {layout === 'a4' ? 'Thermal' : 'A4'}
              </Button>
              <button onClick={onClose} className="text-slate hover:text-obsidian text-xl leading-none">&times;</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-bone rounded-lg">
            <div>
              <p className="text-caption text-slate">Patient</p>
              <p className="text-body font-medium text-obsidian">{patient?.fullName || '-'}</p>
            </div>
            <div>
              <p className="text-caption text-slate">MRN</p>
              <p className="text-body font-medium text-obsidian">{patient?.mrn || '-'}</p>
            </div>
            <div>
              <p className="text-caption text-slate">Gender</p>
              <p className="text-body text-obsidian">{patient?.gender || '-'}</p>
            </div>
            <div>
              <p className="text-caption text-slate">Date</p>
              <p className="text-body text-obsidian">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {vitals && Object.keys(vitals).filter((k) => vitals[k]).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-graphite mb-2">Vital Signs</h3>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(vitals).filter(([_, v]) => v).map(([key, val]) => (
                  <div key={key} className="bg-bone rounded p-2 text-center">
                    <p className="text-caption text-slate">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</p>
                    <p className="text-body font-medium text-obsidian">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {symptoms?.filter((s) => s.name).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-graphite mb-2">Symptoms</h3>
              <div className="space-y-1">
                {symptoms.filter((s) => s.name).map((s, i) => (
                  <div key={i} className="text-sm text-obsidian">
                    <span className="font-medium">{s.name}</span>
                    {s.bodyArea && <span className="text-slate"> · {s.bodyArea}</span>}
                    {s.severity && <span className="text-slate"> · Severity: {s.severity}/10</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-graphite mb-1">Diagnosis</h3>
            <p className="text-body text-obsidian">{diagnosis || '-'}{diagnosisIcd10 ? ` (${diagnosisIcd10})` : ''}</p>
          </div>

          {medications?.filter((m) => m.drugName).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-graphite mb-2">Prescriptions</h3>
              <div className="space-y-1">
                {medications.filter((m) => m.drugName).map((m, i) => (
                  <div key={i} className="text-sm text-obsidian">
                    <span className="font-medium">{m.drugName}</span>
                    {m.dosage && <span className="text-slate"> {m.dosage}</span>}
                    {m.frequency && <span className="text-slate"> · {m.frequency}</span>}
                    {m.duration && <span className="text-slate"> · {m.duration}</span>}
                    {m.route && <span className="text-slate"> · {m.route}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {labOrders?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-graphite mb-2">Lab Orders</h3>
              <div className="space-y-1">
                {labOrders.map((order, i) => (
                  <div key={i} className="text-sm text-obsidian">
                    {(order.tests || []).map((t) => t.test?.name).filter(Boolean).join(', ')}
                    <span className="text-slate"> — {order.status}{order.priority > 0 ? ' (Urgent)' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {imagingOrders?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-graphite mb-2">Imaging Orders</h3>
              <div className="space-y-1">
                {imagingOrders.map((order, i) => (
                  <div key={i} className="text-sm text-obsidian">
                    {order.scanType}{order.laterality ? ` (${order.laterality})` : ''} — {order.status}
                  </div>
                ))}
              </div>
            </div>
          )}

          {referrals?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-graphite mb-2">Referrals</h3>
              <div className="space-y-1">
                {referrals.map((r, i) => (
                  <div key={i} className="text-sm text-obsidian">
                    {(r.type || '').replace(/_/g, ' ')} → {r.toClinic?.name || '—'} — {r.status}
                  </div>
                ))}
              </div>
            </div>
          )}

          {soapNotes && Object.values(soapNotes).some(Boolean) && (
            <div>
              <h3 className="text-sm font-semibold text-graphite mb-2">SOAP Notes</h3>
              <div className="space-y-2">
                {Object.entries(soapNotes).filter(([_, v]) => v).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-caption font-medium text-graphite capitalize">{key}</p>
                    <p className="text-sm text-obsidian whitespace-pre-wrap bg-bone rounded p-2">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handlePrint}>
              Print / Save PDF
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
