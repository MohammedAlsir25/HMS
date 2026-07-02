import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.NOTIFICATION_READ),
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ notifications, unreadCount });
  }),
);

router.put(
  '/:id/read',
  authenticate,
  requirePermission(PERMISSIONS.NOTIFICATION_READ),
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    if (notification.count === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Marked as read' });
  }),
);

router.put(
  '/read-all',
  authenticate,
  requirePermission(PERMISSIONS.NOTIFICATION_READ),
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  }),
);

export default router;
