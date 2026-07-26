import { PrismaClient } from '@prisma/client';
import { createTenantPrisma } from '../middleware/tenant.js';

const basePrisma = new PrismaClient();
export const prisma = createTenantPrisma(basePrisma);
export default prisma;
