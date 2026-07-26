import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        permissions: string[];
        hospitalId?: string;
        [key: string]: unknown;
      };
    }
  }
}
