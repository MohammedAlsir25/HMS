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
        hospitalId?: string;
        permissions: string[];
      };
      patient?: {
        id: string;
        patientId: string;
        email: string;
        hospitalId?: string;
      };
      files?: Express.Multer.File[];
    }
  }
}

export {};
