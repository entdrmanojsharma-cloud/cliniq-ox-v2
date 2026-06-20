/* 
  Purpose: Data Access Object for the Surgery Master Module.
  Responsibility: Map database tables, soft-deletes, pagination, and hospital isolation for surgeries.
*/

class SurgeriesRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, sortBy, sortOrder, category }) {
    const where = {
      hospitalId,
      isActive: true,
      ...(category && { category: { contains: category, mode: 'insensitive' } })
    };

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { surgeryName: 'asc' };

    const [surgeries, total] = await Promise.all([
      this.prisma.surgeryMaster.findMany({
        where,
        skip,
        take,
        orderBy
      }),
      this.prisma.surgeryMaster.count({ where })
    ]);

    return { surgeries, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.surgeryMaster.findFirst({
      where: { id, hospitalId, isActive: true }
    });
  }

  async findByCode(surgeryCode, hospitalId) {
    return this.prisma.surgeryMaster.findFirst({
      where: { surgeryCode, hospitalId, isActive: true }
    });
  }

  async create(data) {
    return this.prisma.surgeryMaster.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.surgeryMaster.updateMany({
      where: { id, hospitalId, isActive: true },
      data
    });
  }
}

module.exports = SurgeriesRepository;
