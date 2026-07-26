import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export async function completeScreening(optometryAppointmentId: string, userId: string, clinicalData: {
  diagnosis?: string;
  diagnosisIcd10?: string;
  prescriptions?: string;
  notes?: string;
  vitalSigns?: Record<string, unknown>;
  symptoms?: Array<Record<string, unknown>>;
  medications?: Array<Record<string, unknown>>;
  autorefraction?: Record<string, string>;
}) {
  const optometryAppt = await prisma.appointment.findUnique({
    where: { id: optometryAppointmentId },
    include: { patient: true, clinic: true },
  });
  if (!optometryAppt) throw new NotFoundError('Optometry appointment not found');
  if (!optometryAppt.targetClinicId) throw new ValidationError('No target clinic set on this optometry appointment');

  const targetClinic = await prisma.clinic.findUnique({ where: { id: optometryAppt.targetClinicId } });
  if (!targetClinic) throw new NotFoundError('Target clinic not found');

  const record = await prisma.clinicalRecord.create({
    data: {
      patientId: optometryAppt.patientId,
      clinicId: optometryAppt.clinic.id,
      diagnosis: clinicalData.diagnosisIcd10
        ? `${clinicalData.diagnosisIcd10} - ${clinicalData.diagnosis || ''}`
        : clinicalData.diagnosis || null,
      prescriptions: clinicalData.prescriptions || null,
      clinicSpecificJson: {
        icd10Code: clinicalData.diagnosisIcd10 || '',
        autoRefraction: clinicalData.autorefraction || {},
        isPreScreening: true,
        targetClinicId: targetClinic.id,
        targetClinicName: targetClinic.name,
      },
      notes: clinicalData.notes || null,
      vitalSigns: clinicalData.vitalSigns ? {
        create: {
          bloodPressureSystolic: (clinicalData.vitalSigns.bloodPressureSystolic as number) || null,
          bloodPressureDiastolic: (clinicalData.vitalSigns.bloodPressureDiastolic as number) || null,
          heartRate: (clinicalData.vitalSigns.heartRate as number) || null,
          temperature: (clinicalData.vitalSigns.temperature as number) || null,
          spo2: (clinicalData.vitalSigns.spo2 as number) || null,
          bloodGlucose: (clinicalData.vitalSigns.bloodGlucose as number) || null,
          weight: (clinicalData.vitalSigns.weight as number) || null,
        },
      } : undefined,
      symptoms: (clinicalData.symptoms as Array<Record<string, unknown>>)?.length ? {
        create: (clinicalData.symptoms as Array<Record<string, unknown>>).map(s => ({
          name: s.name as string,
          bodyArea: (s.bodyArea as string) || null,
          onset: (s.onset as string) || null,
          duration: (s.duration as string) || null,
          severity: s.severity ? Number(s.severity) : null,
          description: (s.description as string) || null,
        })),
      } : undefined,
      medications: (clinicalData.medications as Array<Record<string, unknown>>)?.length ? {
        create: (clinicalData.medications as Array<Record<string, unknown>>).map(m => ({
          drugName: m.drugName as string,
          dosage: (m.dosage as string) || null,
          frequency: (m.frequency as string) || null,
          duration: (m.duration as string) || null,
          route: (m.route as string) || null,
          notes: (m.notes as string) || null,
        })),
      } : undefined,
    },
    include: { vitalSigns: true, symptoms: true, medications: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = await prisma.appointment.findFirst({
    where: { clinicId: targetClinic.id, createdAt: { gte: today } },
    orderBy: { token: 'desc' },
  });
  const nextToken = (last?.token || 0) + 1;

  const targetAppointment = await prisma.appointment.create({
    data: {
      token: nextToken,
      type: 'WALKIN',
      status: 'WAITING',
      priority: 0,
      visitType: 'NEW_VISIT',
      patientId: optometryAppt.patientId,
      clinicId: targetClinic.id,
      doctorId: userId,
      optometryRecordId: record.id,
    },
    include: {
      patient: { select: { fullName: true, mrn: true, gender: true, dateOfBirth: true, phone: true } },
    },
  });

  await prisma.appointment.update({
    where: { id: optometryAppointmentId },
    data: { status: 'COMPLETED' },
  });

  const patient = optometryAppt.patient;

  const autoref = clinicalData.autorefraction || {};
  const printData = {
    htmlPrint: `
      <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
        <h1 style="text-align: center; font-size: 24px; margin-bottom: 8px;">AL Jawahir Hospital</h1>
        <p style="text-align: center; color: #666; margin-bottom: 24px;">Optometry Pre-Screening Report</p>

        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Patient Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 140px;">Name:</td><td>${patient.fullName}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">MRN:</td><td>${patient.mrn}</td></tr>
            ${patient.gender ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Gender:</td><td>${patient.gender}</td></tr>` : ''}
            ${patient.dateOfBirth ? `<tr><td style="padding: 4px 8px; font-weight: 600;">DOB:</td><td>${new Date(patient.dateOfBirth).toLocaleDateString()}</td></tr>` : ''}
            <tr><td style="padding: 4px 8px; font-weight: 600;">Date:</td><td>${new Date().toLocaleDateString()}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Target Clinic:</td><td>${targetClinic.name}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Auto-Refraction</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 2px solid #333;">
              <th style="padding: 8px; text-align: left;"></th>
              <th style="padding: 8px; text-align: left;">Sphere</th>
              <th style="padding: 8px; text-align: left;">Cylinder</th>
              <th style="padding: 8px; text-align: left;">Axis</th>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: 600;">OD (Right)</td>
              <td style="padding: 8px;">${autoref.odSph || '-'}</td>
              <td style="padding: 8px;">${autoref.odCyl || '-'}</td>
              <td style="padding: 8px;">${autoref.odAxis || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: 600;">OS (Left)</td>
              <td style="padding: 8px;">${autoref.osSph || '-'}</td>
              <td style="padding: 8px;">${autoref.osCyl || '-'}</td>
              <td style="padding: 8px;">${autoref.osAxis || '-'}</td>
            </tr>
          </table>
        </div>

        ${clinicalData.diagnosis ? `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Diagnosis</h2>
          <p>${clinicalData.diagnosisIcd10 ? `<strong>ICD-10:</strong> ${clinicalData.diagnosisIcd10}<br>` : ''}${clinicalData.diagnosis}</p>
        </div>` : ''}

        ${clinicalData.notes ? `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Notes</h2>
          <p style="white-space: pre-wrap;">${clinicalData.notes}</p>
        </div>` : ''}

        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 16px;">
          <p>AL Jawahir Hospital &mdash; Optometry Department</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>`,
    thermalText: [
      '================================',
      '  HMS',
      '  Optometry Pre-Screening',
      '================================',
      '',
      `Patient: ${patient.fullName}`,
      `MRN: ${patient.mrn}`,
      `Sex: ${patient.gender || '-'}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Clinic: ${targetClinic.name}`,
      '--------------------------------',
      '-- Auto-Refraction --',
      `OD: ${autoref.odSph || '-'} / ${autoref.odCyl || '-'} x ${autoref.odAxis || '-'}`,
      `OS: ${autoref.osSph || '-'} / ${autoref.osCyl || '-'} x ${autoref.osAxis || '-'}`,
      ...(clinicalData.diagnosis ? ['', '-- Diagnosis --', clinicalData.diagnosis] : []),
      ...(clinicalData.diagnosisIcd10 ? [`ICD-10: ${clinicalData.diagnosisIcd10}`] : []),
      '',
      '--------------------------------',
      'Token: Target clinic',
      `#${String(targetAppointment.token).padStart(3, '0')}`,
      '================================',
    ].join('\n'),
  };

  return {
    targetAppointment,
    clinicalRecord: record,
    printData,
  };
}

export async function generatePrintData(clinicalRecordId: string) {
  const record = await prisma.clinicalRecord.findUnique({
    where: { id: clinicalRecordId },
    include: { patient: true, clinic: true, vitalSigns: true, symptoms: true, medications: true },
  });
  if (!record) throw new NotFoundError('Clinical record not found');

  const json = (record.clinicSpecificJson as Record<string, unknown>) || {};
  const autoref = (json.autoRefraction as Record<string, string>) || {};
  const targetClinicName = (json.targetClinicName as string) || record.clinic.name;

  const patient = record.patient;

  return {
    htmlPrint: `
      <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
        <h1 style="text-align: center; font-size: 24px; margin-bottom: 8px;">HMS</h1>
        <p style="text-align: center; color: #666; margin-bottom: 24px;">Optometry Pre-Screening Report</p>
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Patient Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 140px;">Name:</td><td>${patient.fullName}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">MRN:</td><td>${patient.mrn}</td></tr>
            ${patient.gender ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Gender:</td><td>${patient.gender}</td></tr>` : ''}
            ${patient.dateOfBirth ? `<tr><td style="padding: 4px 8px; font-weight: 600;">DOB:</td><td>${new Date(patient.dateOfBirth).toLocaleDateString()}</td></tr>` : ''}
            <tr><td style="padding: 4px 8px; font-weight: 600;">Date:</td><td>${new Date(record.encounterDate).toLocaleDateString()}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Target Clinic:</td><td>${targetClinicName}</td></tr>
          </table>
        </div>
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Auto-Refraction</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 2px solid #333;">
              <th style="padding: 8px; text-align: left;"></th>
              <th style="padding: 8px; text-align: left;">Sphere</th>
              <th style="padding: 8px; text-align: left;">Cylinder</th>
              <th style="padding: 8px; text-align: left;">Axis</th>
            </tr>
            <tr><td style="padding: 8px; font-weight: 600;">OD (Right)</td><td style="padding: 8px;">${autoref.odSph || '-'}</td><td style="padding: 8px;">${autoref.odCyl || '-'}</td><td style="padding: 8px;">${autoref.odAxis || '-'}</td></tr>
            <tr><td style="padding: 8px; font-weight: 600;">OS (Left)</td><td style="padding: 8px;">${autoref.osSph || '-'}</td><td style="padding: 8px;">${autoref.osCyl || '-'}</td><td style="padding: 8px;">${autoref.osAxis || '-'}</td></tr>
          </table>
        </div>
        ${record.diagnosis ? `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Diagnosis</h2>
          <p>${record.diagnosis}</p>
        </div>` : ''}
        ${record.notes ? `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Notes</h2>
          <p style="white-space: pre-wrap;">${record.notes}</p>
        </div>` : ''}
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 16px;">
          <p>HMS &mdash; Optometry Department</p>
          <p>Report generated on ${new Date(record.encounterDate).toLocaleString()}</p>
        </div>
      </div>`,
    thermalText: [
      '================================',
      '  HMS',
      '  Optometry Pre-Screening',
      '================================',
      '',
      `Patient: ${patient.fullName}`,
      `MRN: ${patient.mrn}`,
      `Date: ${new Date(record.encounterDate).toLocaleDateString()}`,
      `Clinic: ${targetClinicName}`,
      '--------------------------------',
      '-- Auto-Refraction --',
      `OD: ${autoref.odSph || '-'} / ${autoref.odCyl || '-'} x ${autoref.odAxis || '-'}`,
      `OS: ${autoref.osSph || '-'} / ${autoref.osCyl || '-'} x ${autoref.osAxis || '-'}`,
      ...(record.diagnosis ? ['', '-- Diagnosis --', record.diagnosis] : []),
      '',
      '================================',
    ].join('\n'),
  };
}
