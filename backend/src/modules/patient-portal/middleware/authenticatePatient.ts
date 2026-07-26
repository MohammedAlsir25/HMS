import type { Request, Response, NextFunction } from 'express';
import { verifyPatientToken } from '../utils/jwt.js';
import { setHospitalId, setUserId } from '../../../middleware/requestContext.js';

export function authenticatePatient(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid authorization header' });
    return;
  }
  const token = authHeader.split(' ')[1]!;
  try {
    const decoded = verifyPatientToken(token);
    if (decoded.type !== 'patient') {
      res.status(401).json({ message: 'Invalid token type' });
      return;
    }
    req.patient = {
      id: decoded.id,
      patientId: decoded.patientId,
      email: decoded.email,
      hospitalId: decoded.hospitalId,
    };
    if (decoded.hospitalId) {
      setHospitalId(decoded.hospitalId);
    }
    setUserId(decoded.id);
    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ message: 'Invalid token' });
  }
}
