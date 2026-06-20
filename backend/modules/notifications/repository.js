/* 
  Purpose: Database access repository for the notifications module.
  Responsibility: Handle Prisma queries and database schema actions.
*/

class NotificationsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, userId, skip, take, isRead }) {
    const where = {
      hospitalId,
      userId,
      ...(isRead !== undefined && { isRead })
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.notification.count({ where })
    ]);

    return { notifications, total };
  }

  async findById(id, hospitalId, userId) {
    return this.prisma.notification.findFirst({
      where: { id, hospitalId, userId }
    });
  }

  async create(data) {
    return this.prisma.notification.create({
      data: {
        hospitalId: data.hospitalId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        linkId: data.linkId || null,
        isRead: false
      }
    });
  }

  async markRead(id, hospitalId, userId) {
    return this.prisma.notification.updateMany({
      where: { id, hospitalId, userId },
      data: { isRead: true }
    });
  }

  async markAllRead(hospitalId, userId) {
    return this.prisma.notification.updateMany({
      where: { hospitalId, userId, isRead: false },
      data: { isRead: true }
    });
  }
}

module.exports = NotificationsRepository;
