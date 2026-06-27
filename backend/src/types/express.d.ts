import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        permissions: string[];
        [key: string]: unknown;
      };
    }
  }
}
