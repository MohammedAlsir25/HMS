import jwt from 'jsonwebtoken';
import { config } from '../../../config/index.js';

const PATIENT_JWT_SECRET = config.patientJwt.secret;
const PATIENT_JWT_EXPIRY = config.patientJwt.expiry;

interface PatientTokenPayload {
  id: string;
  patientId: string;
  email: string;
  hospitalId?: string;
  type: 'patient';
}

export function signPatientToken(payload: Omit<PatientTokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'patient' as const },
    PATIENT_JWT_SECRET,
    { expiresIn: PATIENT_JWT_EXPIRY as jwt.SignOptions['expiresIn'] },
  );
}

export function verifyPatientToken(token: string): PatientTokenPayload {
  return jwt.verify(token, PATIENT_JWT_SECRET) as PatientTokenPayload;
}
