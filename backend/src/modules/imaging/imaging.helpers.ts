import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export async function completeImagingOrder(imagingOrderId: string, userId: string, clinicalData: {
  findings?: string;
  impression?: string;
}) {
  const order = await prisma.imagingOrder.findUnique({ where: { id: imagingOrderId } });
  if (!order) throw new NotFoundError('Imaging order not found');
  if (order.status !== 'IN_PROGRESS') throw new ValidationError('Order must be IN_PROGRESS to complete');

  const [patient, fromClinic, files] = await Promise.all([
    prisma.patient.findUnique({ where: { id: order.patientId } }),
    prisma.clinic.findUnique({ where: { id: order.requestedByClinicId } }),
    prisma.imagingFile.findMany({ where: { imagingOrderId }, orderBy: { createdAt: 'desc' } }),
  ]);
  if (!patient) throw new NotFoundError('Patient not found');
  if (!fromClinic) throw new NotFoundError('Referring clinic not found');

  const record = await prisma.clinicalRecord.create({
    data: {
      patientId: order.patientId,
      clinicId: order.clinicId,
      diagnosis: null,
      prescriptions: null,
      clinicSpecificJson: {
        isImagingResult: true,
        scanType: order.scanType,
        laterality: order.laterality,
        clinicalInfo: order.clinicalInfo,
        findings: clinicalData.findings || order.findings || '',
        impression: clinicalData.impression || order.impression || '',
        referringClinicId: order.requestedByClinicId,
        referringClinicName: fromClinic.name,
        fileCount: files.length,
        imagingOrderId: order.id,
      },
      notes: `Imaging Report - ${order.scanType}`,
    },
  });

  await prisma.imagingOrder.update({
    where: { id: imagingOrderId },
    data: {
      status: 'COMPLETED',
      findings: clinicalData.findings || order.findings,
      impression: clinicalData.impression || order.impression,
      completedById: userId,
      completedAt: new Date(),
      clinicalRecordId: record.id,
    },
  });

  const printData = {
    htmlPrint: `
      <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
        <h1 style="text-align: center; font-size: 24px; margin-bottom: 8px;">AL Jawahir Hospital</h1>
        <p style="text-align: center; color: #666; margin-bottom: 24px;">Medical Imaging Report</p>

        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Patient Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 140px;">Name:</td><td>${patient.fullName}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">MRN:</td><td>${patient.mrn}</td></tr>
            ${patient.gender ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Gender:</td><td>${patient.gender}</td></tr>` : ''}
            ${patient.dateOfBirth ? `<tr><td style="padding: 4px 8px; font-weight: 600;">DOB:</td><td>${new Date(patient.dateOfBirth).toLocaleDateString()}</td></tr>` : ''}
            <tr><td style="padding: 4px 8px; font-weight: 600;">Date:</td><td>${new Date().toLocaleDateString()}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: 600;">Referring Clinic:</td><td>${fromClinic.name}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Scan Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 8px; font-weight: 600; width: 140px;">Scan Type:</td><td>${order.scanType}</td></tr>
            ${order.laterality ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Eye:</td><td>${order.laterality}</td></tr>` : ''}
            ${order.clinicalInfo ? `<tr><td style="padding: 4px 8px; font-weight: 600;">Clinical Info:</td><td>${order.clinicalInfo}</td></tr>` : ''}
          </table>
        </div>

        ${clinicalData.findings || order.findings ? `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Findings</h2>
          <p style="white-space: pre-wrap;">${clinicalData.findings || order.findings}</p>
        </div>` : ''}

        ${clinicalData.impression || order.impression ? `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Impression</h2>
          <p style="white-space: pre-wrap;">${clinicalData.impression || order.impression}</p>
        </div>` : ''}

        ${files.length > 0 ? `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin-bottom: 12px;">Attached Files (${files.length})</h2>
          <ul style="list-style: none; padding: 0;">
            ${files.map(f => `<li style="padding: 4px 0;">${f.originalName}</li>`).join('')}
          </ul>
        </div>` : ''}

        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 16px;">
          <p>AL Jawahir Hospital &mdash; Medical Imaging Department</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>`,
    thermalText: [
      '================================',
      '  AL JAWAHIR HOSPITAL',
      '  Medical Imaging Report',
      '================================',
      '',
      `Patient: ${patient.fullName}`,
      `MRN: ${patient.mrn}`,
      `Scan: ${order.scanType}${order.laterality ? ` (${order.laterality})` : ''}`,
      `Clinic: ${fromClinic.name}`,
      `Date: ${new Date().toLocaleDateString()}`,
      '--------------------------------',
      ...(order.clinicalInfo ? ['', `Info: ${order.clinicalInfo}`] : []),
      ...(clinicalData.findings || order.findings ? ['', '-- Findings --', (clinicalData.findings || order.findings)!] : []),
      ...(clinicalData.impression || order.impression ? ['', '-- Impression --', (clinicalData.impression || order.impression)!] : []),
      '',
      '================================',
    ].join('\n'),
  };

  return { clinicalRecord: record, printData, order };
}

export async function dismissImagingOrder(imagingOrderId: string) {
  const order = await prisma.imagingOrder.findUnique({ where: { id: imagingOrderId } });
  if (!order) throw new NotFoundError('Imaging order not found');
  if (order.status !== 'COMPLETED') throw new ValidationError('Order must be COMPLETED to dismiss');

  await prisma.imagingOrder.update({
    where: { id: imagingOrderId },
    data: { status: 'DISMISSED' },
  });

  if (order.referralId) {
    await prisma.referral.update({
      where: { id: order.referralId },
      data: { status: 'FULFILLED' },
    });
  }

  return { order };
}
