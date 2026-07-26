import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

const prisma = new PrismaClient();
const router = Router();

router.get('/endpoints', authenticate, requirePermission(PERMISSIONS.INTEGRATION_MANAGE), asyncHandler(async (_req, res) => {
  const endpoints = await prisma.fhirEndpoint.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(endpoints);
}));

router.post('/endpoints', authenticate, requirePermission(PERMISSIONS.INTEGRATION_MANAGE), asyncHandler(async (req, res) => {
  const { name, baseUrl, authType, authConfig, description } = req.body;
  const endpoint = await prisma.fhirEndpoint.create({
    data: {
      name,
      baseUrl,
      authType: authType || 'bearer',
      authConfig: authConfig || {},
      description,
      hospitalId: (req as any).hospitalId,
    },
  });
  res.status(201).json(endpoint);
}));

router.patch('/endpoints/:id', authenticate, requirePermission(PERMISSIONS.INTEGRATION_MANAGE), asyncHandler(async (req, res) => {
  const { status, name, description } = req.body;
  const endpoint = await prisma.fhirEndpoint.update({
    where: { id: req.params.id },
    data: {
      ...(status && { status }),
      ...(name && { name }),
      ...(description !== undefined && { description }),
    },
  });
  res.json(endpoint);
}));

router.delete('/endpoints/:id', authenticate, requirePermission(PERMISSIONS.INTEGRATION_MANAGE), asyncHandler(async (req, res) => {
  await prisma.fhirEndpoint.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

router.post('/endpoints/:id/test', authenticate, requirePermission(PERMISSIONS.INTEGRATION_MANAGE), asyncHandler(async (req, res) => {
  const endpoint = await prisma.fhirEndpoint.findUnique({ where: { id: req.params.id } });
  if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });

  try {
    const response = await fetch(`${endpoint.baseUrl}/metadata`);
    if (response.ok) {
      await prisma.fhirEndpoint.update({
        where: { id: endpoint.id },
        data: { status: 'active', lastSyncAt: new Date(), errorCount: 0, lastError: null },
      });
      return res.json({ success: true, message: 'Connection successful' });
    }
    await prisma.fhirEndpoint.update({
      where: { id: endpoint.id },
      data: { status: 'error', lastError: `HTTP ${response.status}` },
    });
    return res.json({ success: false, message: `HTTP ${response.status}` });
  } catch (fetchErr: any) {
    await prisma.fhirEndpoint.update({
      where: { id: endpoint.id },
      data: { status: 'error', errorCount: { increment: 1 }, lastError: fetchErr.message },
    });
    return res.json({ success: false, message: fetchErr.message });
  }
}));

export default router;
