import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const FHIR_AUTH_MODE = process.env.FHIR_AUTH_MODE || 'jwt';
const FHIR_JWT_SECRET = process.env.FHIR_JWT_SECRET || process.env.JWT_SECRET;

export function fhirAuth(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metadata') return next();

  if (FHIR_AUTH_MODE === 'none') return next();

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'login', diagnostics: 'Authorization header required' }],
    });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, FHIR_JWT_SECRET!) as Record<string, unknown>;
    (req as unknown as Record<string, unknown>).fhirUser = decoded;
    return next();
  } catch {
    return res.status(401).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'expired', diagnostics: 'Invalid or expired token' }],
    });
  }
}
