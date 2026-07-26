import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CcdaDocument {
  xml: string;
  title: string;
  type: string;
}

function escXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generatePatientSummary(patientId: string): Promise<CcdaDocument> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      clinicalRecords: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { medications: true, vitalSigns: true, symptoms: true },
      },
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 20 },
      insurancePolicies: { include: { insuranceCompany: true } },
    },
  });

  if (!patient) throw new Error('Patient not found');

  const now = new Date().toISOString();
  const sections: string[] = [];
  const records = (patient as any).clinicalRecords as Array<{
    diagnosis?: string | null;
    medications: Array<{ drugName: string; dosage?: string | null; frequency?: string | null }>;
    vitalSigns: Array<{
      bloodPressureSystolic?: number | null;
      bloodPressureDiastolic?: number | null;
      heartRate?: number | null;
      temperature?: any;
      spo2?: number | null;
      bloodGlucose?: number | null;
      weight?: any;
      recordedAt?: Date;
    }>;
    createdAt?: Date;
  }>;

  sections.push(`
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.1.1"/>
      <code code="29554-3" displayName="PATIENT DEMOGRAPHICS" codeSystem="2.16.840.1.113883.6.1"/>
      <title>Patient Demographics</title>
      <text>
        <table>
          <thead><tr><th>Property</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Full Name</td><td>${escXml(patient.fullName)}</td></tr>
            <tr><td>MRN</td><td>${escXml(patient.mrn)}</td></tr>
            <tr><td>Date of Birth</td><td>${patient.dateOfBirth?.toISOString().split('T')[0] || 'Unknown'}</td></tr>
            <tr><td>Gender</td><td>${patient.gender || 'Unknown'}</td></tr>
            <tr><td>Phone</td><td>${escXml(patient.phone || 'N/A')}</td></tr>
            <tr><td>Email</td><td>${escXml(patient.email || 'N/A')}</td></tr>
            <tr><td>Address</td><td>${escXml(patient.address || 'N/A')}</td></tr>
          </tbody>
        </table>
      </text>
      <entry type="DRIV">
        <act classCode="ACT" moodCode="EVN">
          <templateId root="2.16.840.1.113883.10.20.22.4.2"/>
          <id root="${patient.id.replace(/-/g, '')}"/>
          <code code="GP2Y" displayName="Patient Name" codeSystem="2.16.840.1.113883.5.4"/>
          <statusCode code="active"/>
          <subject>
            <patient>
              <name use="L">${escXml(patient.fullName)}</name>
              <administrativeGenderCode code="${patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'F' : 'UN'}" codeSystem="2.16.840.1.113883.5.1"/>
              <birthTime value="${patient.dateOfBirth?.toISOString().replace(/[-T:]/g, '').substring(0, 8) || ''}"/>
            </patient>
          </subject>
        </act>
      </entry>
    </section>`);

  const conditions = records
    .filter(r => r.diagnosis)
    .map(r => r.diagnosis!);

  if (conditions.length > 0) {
    sections.push(`
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.5.1"/>
      <code code="11450-4" displayName="PROBLEM LIST" codeSystem="2.16.840.1.113883.6.1"/>
      <title>Problem List</title>
      <text>
        <list>
          ${conditions.map(c => `<item>${escXml(c)}</item>`).join('\n          ')}
        </list>
      </text>
      ${conditions.map(c => `
      <entry type="DRIV">
        <act classCode="ACT" moodCode="EVN">
          <templateId root="2.16.840.1.113883.10.20.22.4.3"/>
          <id root="${c.replace(/[^a-zA-Z0-9]/g, '').substring(0, 32).padEnd(32, '0')}"/>
          <code code="${escXml(c)}" displayName="${escXml(c)}" codeSystem="2.16.840.1.113883.6.3"/>
          <statusCode code="active"/>
        </act>
      </entry>`).join('')}
    </section>`);
  }

  const medications = records.flatMap(r => r.medications).filter(Boolean);

  if (medications.length > 0) {
    sections.push(`
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.1.1"/>
      <code code="10160-0" displayName="HISTORY OF MEDICATION USE" codeSystem="2.16.840.1.113883.6.1"/>
      <title>Medication List</title>
      <text>
        <list>
          ${medications.map(m => `<item>${escXml(m.drugName)} ${escXml(m.dosage || '')} ${escXml(m.frequency || '')}</item>`).join('\n          ')}
        </list>
      </text>
    </section>`);
  }

  const latestVitals = records
    .filter(r => r.vitalSigns.length > 0)
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))[0];

  if (latestVitals) {
    const vs = latestVitals.vitalSigns[0];
    if (vs) {
      const vitalEntries: Array<[string, string]> = [];
      if (vs.bloodPressureSystolic != null) vitalEntries.push(['Blood Pressure Systolic', `${vs.bloodPressureSystolic} mmHg`]);
      if (vs.bloodPressureDiastolic != null) vitalEntries.push(['Blood Pressure Diastolic', `${vs.bloodPressureDiastolic} mmHg`]);
      if (vs.heartRate != null) vitalEntries.push(['Heart Rate', `${vs.heartRate} bpm`]);
      if (vs.temperature != null) vitalEntries.push(['Temperature', `${vs.temperature} °C`]);
      if (vs.spo2 != null) vitalEntries.push(['SpO2', `${vs.spo2}%`]);
      if (vs.bloodGlucose != null) vitalEntries.push(['Blood Glucose', `${vs.bloodGlucose} mg/dL`]);
      if (vs.weight != null) vitalEntries.push(['Weight', `${vs.weight} kg`]);

      if (vitalEntries.length > 0) {
        sections.push(`
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.4.1"/>
      <code code="8716-3" displayName="VITAL SIGNS" codeSystem="2.16.840.1.113883.6.1"/>
      <title>Vital Signs</title>
      <text>
        <table>
          <thead><tr><th>Vital</th><th>Value</th><th>Date</th></tr></thead>
          <tbody>
            ${vitalEntries.map(([k, v]) => `<tr><td>${escXml(k)}</td><td>${escXml(v)}</td><td>${vs.recordedAt?.toISOString().split('T')[0] || ''}</td></tr>`).join('\n            ')}
          </tbody>
        </table>
      </text>
    </section>`);
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <id root="${patient.id.replace(/-/g, '')}"/>
  <code code="34133-9" displayName="Summarization of Episode Note" codeSystem="2.16.840.1.113883.6.1"/>
  <title>Patient Summary</title>
  <effectiveTime value="${now.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>
  <recordTarget>
    <patientRole>
      <id extension="${escXml(patient.mrn)}" root="2.16.840.1.113883.3.0.0"/>
      ${patient.phone ? `<telecom value="tel:${escXml(patient.phone)}" use="HP"/>` : ''}
      ${patient.address ? `<addr><streetAddressLine>${escXml(patient.address)}</streetAddressLine></addr>` : ''}
      <patient>
        <name use="L">
          <given>${escXml(patient.fullName?.split(' ').slice(0, -1).join(' ') || '')}</given>
          <family>${escXml(patient.fullName?.split(' ').slice(-1)[0] || '')}</family>
        </name>
        <administrativeGenderCode code="${patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'F' : 'UN'}" codeSystem="2.16.840.1.113883.5.1"/>
        <birthTime value="${patient.dateOfBirth?.toISOString().replace(/[-T:]/g, '').substring(0, 8) || ''}"/>
      </patient>
    </patientRole>
  </recordTarget>
  <component>
    <structuredBody>
      ${sections.join('')}
    </structuredBody>
  </component>
</ClinicalDocument>`;

  return { xml, title: `Patient Summary - ${patient.fullName}`, type: 'patient-summary' };
}

export async function generateDischargeSummary(surgeryId: string): Promise<CcdaDocument> {
  const surgery = await prisma.surgery.findUnique({
    where: { id: surgeryId },
    include: {
      patient: true,
      operationType: true,
      teamMembers: { include: { role: true, user: true } },
      postoperativeNotes: true,
      dischargeSummary: true,
    },
  });

  if (!surgery) throw new Error('Surgery not found');

  const now = new Date().toISOString();
  const patient = surgery.patient;
  const surgeon = surgery.teamMembers.find(m => m.role?.name?.toLowerCase().includes('surgeon'));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <id root="${surgery.id.replace(/-/g, '')}"/>
  <code code="18842-5" displayName="Discharge Summary" codeSystem="2.16.840.1.113883.6.1"/>
  <title>Discharge Summary</title>
  <effectiveTime value="${now.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>
  <recordTarget>
    <patientRole>
      <id extension="${escXml(patient?.mrn || '')}" root="2.16.840.1.113883.3.0.0"/>
      <patient>
        <name use="L">
          <given>${escXml(patient?.fullName?.split(' ').slice(0, -1).join(' ') || '')}</given>
          <family>${escXml(patient?.fullName?.split(' ').slice(-1)[0] || '')}</family>
        </name>
        <administrativeGenderCode code="${patient?.gender === 'MALE' ? 'M' : patient?.gender === 'FEMALE' ? 'F' : 'UN'}" codeSystem="2.16.840.1.113883.5.1"/>
        <birthTime value="${patient?.dateOfBirth?.toISOString().replace(/[-T:]/g, '').substring(0, 8) || ''}"/>
      </patient>
    </patientRole>
  </recordTarget>
  <component>
    <structuredBody>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.1.1"/>
        <code code="8648-8" displayName="DISCHARGE DIAGNOSIS" codeSystem="2.16.840.1.113883.6.1"/>
        <title>Discharge Diagnosis</title>
        <text><list><item>${escXml(surgery.notes || surgery.operationType?.name || 'N/A')}</item></list></text>
      </section>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.7.1"/>
        <code code="10162-0" displayName="HISTORY OF SURGICAL PROCEDURES" codeSystem="2.16.840.1.113883.6.1"/>
        <title>Procedures Performed</title>
        <text>
          <table>
            <thead><tr><th>Procedure</th><th>Date</th><th>Surgeon</th></tr></thead>
            <tbody>
              <tr>
                <td>${escXml(surgery.operationType?.name || '')}</td>
                <td>${surgery.startTime?.toISOString().split('T')[0] || ''}</td>
                <td>${escXml(surgeon?.user?.fullName || surgeon?.name || '')}</td>
              </tr>
            </tbody>
          </table>
        </text>
      </section>
      ${surgery.postoperativeNotes.length > 0 ? `
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.2.1"/>
        <code code="11504-8" displayName="SURGICAL OPERATION NOTE" codeSystem="2.16.840.1.113883.6.1"/>
        <title>Post-Operative Notes</title>
        <text><paragraph>${escXml(surgery.postoperativeNotes.map(n => n.content).join('\n'))}</paragraph></text>
      </section>` : ''}
      ${surgery.dischargeSummary ? `
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.4.1"/>
        <code code="8653-8" displayName="DISCHARGE INSTRUCTIONS" codeSystem="2.16.840.1.113883.6.1"/>
        <title>Discharge Instructions</title>
        <text>
          ${surgery.dischargeSummary.dischargeNotes ? `<paragraph>${escXml(surgery.dischargeSummary.dischargeNotes)}</paragraph>` : ''}
          ${surgery.dischargeSummary.medications ? `<paragraph>Medications: ${escXml(surgery.dischargeSummary.medications)}</paragraph>` : ''}
          ${surgery.dischargeSummary.followUpInstructions ? `<paragraph>Follow-up: ${escXml(surgery.dischargeSummary.followUpInstructions)}</paragraph>` : ''}
        </text>
      </section>` : ''}
    </structuredBody>
  </component>
</ClinicalDocument>`;

  return { xml, title: `Discharge Summary - ${patient?.fullName || 'Unknown'}`, type: 'discharge-summary' };
}
