/* 
  Purpose: Business service orchestration layer for the Rooms Master Module.
  Responsibility: Enforce room name uniqueness per tenant, audit actions, and process soft deletes.
*/

const writeAuditLog = require('../../shared/audit');

class RoomsService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getRooms(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { rooms, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    });

    return {
      rooms,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getRoomById(id, hospitalId) {
    const room = await this.repository.findById(id, hospitalId);
    if (!room) {
      const err = new Error('Room record not found.');
      err.status = 404;
      err.code = 'ERR_ROOM_NOT_FOUND';
      throw err;
    }
    return room;
  }

  async createRoom(hospitalId, data, userContext) {
    const existing = await this.repository.findByName(data.roomName, hospitalId);
    if (existing) {
      const err = new Error('A room with this name already exists.');
      err.status = 409;
      err.code = 'ERR_ROOM_EXISTS';
      throw err;
    }

    const newRoom = await this.repository.create({
      hospitalId,
      roomName: data.roomName,
      roomType: data.roomType,
      defaultDailyCharge: data.defaultDailyCharge || 0.00
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_ROOM',
      targetTable: 'rooms_master',
      targetId: newRoom.id,
      payload: newRoom
    });

    return newRoom;
  }

  async updateRoom(id, hospitalId, data, userContext) {
    const existing = await this.getRoomById(id, hospitalId);

    if (data.roomName && data.roomName !== existing.roomName) {
      const nameCheck = await this.repository.findByName(data.roomName, hospitalId);
      if (nameCheck) {
        const err = new Error('A room with this name already exists.');
        err.status = 409;
        err.code = 'ERR_ROOM_EXISTS';
        throw err;
      }
    }

    await this.repository.update(id, hospitalId, {
      roomName: data.roomName,
      roomType: data.roomType,
      defaultDailyCharge: data.defaultDailyCharge
    });

    const updated = await this.getRoomById(id, hospitalId);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_ROOM',
      targetTable: 'rooms_master',
      targetId: id,
      payload: { previous: existing, updated }
    });

    return updated;
  }

  async softDeleteRoom(id, hospitalId, userContext) {
    await this.getRoomById(id, hospitalId);

    await this.repository.update(id, hospitalId, {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: userContext.userId
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'SOFT_DELETE_ROOM',
      targetTable: 'rooms_master',
      targetId: id,
      payload: { id, status: 'DEACTIVATED' }
    });

    return { id, success: true };
  }
}

module.exports = RoomsService;
