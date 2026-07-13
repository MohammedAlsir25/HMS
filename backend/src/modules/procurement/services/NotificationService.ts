import prisma from '../../../lib/prisma.js';

export class NotificationService {
  static async notify(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string,
  ) {
    await prisma.notification.create({
      data: { userId, title, message, actionUrl },
    });
  }

  static async notifyApprovers(
    permission: string,
    title: string,
    message: string,
    actionUrl?: string,
  ) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          permissions: { array_contains: permission },
        },
      },
    });
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title,
        message,
        actionUrl,
      })),
    });
  }
}
