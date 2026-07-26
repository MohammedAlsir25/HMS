import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getRequestContext } from './requestContext.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid authorization header' });
    return;
  }
  const token = authHeader.split(' ')[1]!;
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded as Request['user'];

    const ctx = getRequestContext();
    if (ctx) {
      const d = decoded as Record<string, unknown>;
      ctx.hospitalId = (d['hospitalId'] as string) || null;
      ctx.userId = req.user!.id;
      ctx.role = req.user!.role;
    }

    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ message: 'Invalid token' });
  }
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.permissions) {
      res.status(403).json({ message: 'No permissions found' });
      return;
    }
    const hasAll = permissions.every((p) => req.user!.permissions.includes(p));
    if (!hasAll) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
