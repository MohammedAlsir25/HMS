import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        clinicId?: string | null;
        clinicSlug?: string | null;
        permissions: string[];
      };
      files?: Express.Multer.File[];
    }
  }
}

export {};
