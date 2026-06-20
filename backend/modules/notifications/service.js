/* 
  Purpose: Business service orchestration layer for the notifications module.
  Responsibility: Handle validations and execute transaction workflows.
*/

class NotificationsService {
  constructor(repository) {
    this.repository = repository;
  }

  async getNotifications(hospitalId, userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    let isRead;
    if (query.isRead === 'true' || query.isRead === true) {
      isRead = true;
    } else if (query.isRead === 'false' || query.isRead === false) {
      isRead = false;
    }

    const { notifications, total } = await this.repository.findAndCount({
      hospitalId,
      userId,
      skip,
      take: limit,
      isRead
    });

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async markNotificationAsRead(id, hospitalId, userId) {
    const existing = await this.repository.findById(id, hospitalId, userId);
    if (!existing) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    await this.repository.markRead(id, hospitalId, userId);
    return { id, isRead: true };
  }

  async markAllNotificationsAsRead(hospitalId, userId) {
    await this.repository.markAllRead(hospitalId, userId);
    return { success: true };
  }

  async executeCreate(data) {
    if (!data.hospitalId || !data.userId || !data.title || !data.message || !data.type) {
      const error = new Error('Missing required notification fields');
      error.statusCode = 400;
      throw error;
    }
    return this.repository.create(data);
  }
}

module.exports = NotificationsService;
