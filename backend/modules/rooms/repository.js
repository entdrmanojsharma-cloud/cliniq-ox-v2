/* 
  Purpose: Data Access Object for the Rooms Master Module.
  Responsibility: Perform queries and isolation mappings on RoomMaster records in the database.
*/

class RoomsRepository {
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
      this.prisma.roomMaster.findMany({
        where,
        skip,
        take,
        orderBy
      }),
      this.prisma.roomMaster.count({ where })
    ]);

    return { rooms, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.roomMaster.findFirst({
      where: { id, hospitalId, isActive: true }
    });
  }

  async findByName(roomName, hospitalId) {
    return this.prisma.roomMaster.findFirst({
      where: { roomName, hospitalId, isActive: true }
    });
  }

  async create(data) {
    return this.prisma.roomMaster.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.roomMaster.updateMany({
      where: { id, hospitalId, isActive: true },
      data
    });
  }
}

module.exports = RoomsRepository;
