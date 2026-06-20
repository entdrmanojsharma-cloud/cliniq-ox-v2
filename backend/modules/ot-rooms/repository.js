/* 
  Purpose: Data Access Object for the OT Rooms Master Module.
  Responsibility: Scope OT room listings and CRUD database operations to specific hospital tenants.
*/

class OtRoomsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, sortBy, sortOrder }) {
    const where = {
      hospitalId,
      isActive: true
    };

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { roomName: 'asc' };

    const [rooms, total] = await Promise.all([
      this.prisma.otRoomMaster.findMany({
        where,
        skip,
        take,
        orderBy
      }),
      this.prisma.otRoomMaster.count({ where })
    ]);

    return { rooms, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.otRoomMaster.findFirst({
      where: { id, hospitalId, isActive: true }
    });
  }

  async findByName(roomName, hospitalId) {
    return this.prisma.otRoomMaster.findFirst({
      where: { roomName, hospitalId, isActive: true }
    });
  }

  async create(data) {
    return this.prisma.otRoomMaster.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.otRoomMaster.updateMany({
      where: { id, hospitalId, isActive: true },
      data
    });
  }
}

module.exports = OtRoomsRepository;
