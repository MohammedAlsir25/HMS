export function generateSurgeryPrintHtml(surgery: any): string {
  const s = surgery;
  const p = s.patient || {};
  const dept = s.department || {};
  const opType = s.operationType || {};
  const waiver = s.preoperativeRequest?.waiver;
  const team = s.teamMembers || [];
  const events = s.intraoperativeEvents || [];

  return `
    <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
      <h1 style="text-align: center; font-size: 24px; margin-bottom: 4px;">HMS</h1>
      <p style="text-align: center; color: #666; margin-bottom: 24px;">Surgical Report</p>

      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 12px;">Patient Information</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 4px 8px; font-weight: 600; width: 140px;">Name:</td><td>${esc(p.fullName || '')}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">MRN:</td><td>${esc(p.mrn || '')}</td></tr>
          ${p.gender ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Gender:</td><td>${esc(p.gender)}</td></tr>` : ''}
          ${p.dateOfBirth ? `<tr><td style="padding: 4px 8px; font-weight: 600;">DOB:</td><td>${new Date(p.dateOfBirth).toLocaleDateString()}</td></tr>` : ''}
          ${p.phone ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Phone:</td><td>${esc(p.phone)}</td></tr>` : ''}
        </table>
      </div>

      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 12px;">Surgery Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 4px 8px; font-weight: 600; width: 140px;">Department:</td><td>${esc(dept.name || '')}${dept.nameAr ? ` (${esc(dept.nameAr)})` : ''}</td></tr>
          ${opType.name ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Operation:</td><td>${esc(opType.name)}</td></tr>` : ''}
          <tr><td style="padding: 4px 8px; font-weight: 600;">OR Room:</td><td>${s.orRoom ? `OR ${s.orRoom}` : '-'}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">Start:</td><td>${new Date(s.startTime).toLocaleString()}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">End:</td><td>${new Date(s.endTime).toLocaleString()}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">Status:</td><td>${s.status}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">Disposition:</td><td>${
            s.disposition === 'DISCHARGE_HOME' ? 'Discharge Home' :
            s.disposition === 'ADMIT_WARD' ? 'Admit to Ward' : 'Pending'
          }</td></tr>
          ${s.anesthesiaType ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Anesthesia:</td><td>${esc(s.anesthesiaType)}</td></tr>` : ''}
        </table>
      </div>

      ${s.notes ? `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 12px;">Surgery Notes</h2>
        <p style="white-space: pre-wrap;">${esc(s.notes)}</p>
      </div>` : ''}

      ${team.length > 0 ? `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 12px;">Surgical Team</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="padding: 8px; text-align: left;">Name</th>
            <th style="padding: 8px; text-align: left;">Role</th>
          </tr>
          ${team.map((m: any) => `
          <tr>
            <td style="padding: 8px;">${esc(m.name)}</td>
            <td style="padding: 8px;">${esc(m.role?.name || '')}</td>
          </tr>`).join('')}
        </table>
      </div>` : ''}

      ${events.length > 0 ? `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 12px;">Intraoperative Events</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="padding: 8px; text-align: left;">Time</th>
            <th style="padding: 8px; text-align: left;">Event</th>
            <th style="padding: 8px; text-align: left;">Description</th>
          </tr>
          ${events.map((e: any) => `
          <tr>
            <td style="padding: 8px;">${new Date(e.timestamp).toLocaleTimeString()}</td>
            <td style="padding: 8px;">${esc(e.eventType?.name || '')}</td>
            <td style="padding: 8px;">${esc(e.description || '')}</td>
          </tr>`).join('')}
        </table>
      </div>` : ''}

      ${waiver ? `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 12px;">Consent & Waiver</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 4px 8px; font-weight: 600; width: 140px;">Signed By:</td><td>${esc(waiver.signedBy)}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">Relationship:</td><td>${waiver.relationship}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">Signed At:</td><td>${new Date(waiver.signedAt).toLocaleString()}</td></tr>
        </table>
      </div>` : ''}

      <div style="text-align: center; color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 16px;">
        <p>HMS &mdash; Surgical Department</p>
        <p>Report generated on ${new Date().toLocaleString()}</p>
      </div>
    </div>`;
}

function esc(s: string): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
