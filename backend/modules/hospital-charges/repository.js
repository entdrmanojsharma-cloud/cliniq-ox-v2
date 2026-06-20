/* 
  Purpose: Data Access Object for the Hospital Charges Master Module.
  Responsibility: Provide interface for CRUD operations on HospitalChargeMaster with isolation and soft-delete filters.
*/

class HospitalChargesRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, sortBy, sortOrder }) {
    const where = {
      hospitalId,
      isActive: true
    };

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { chargeName: 'asc' };

    const [charges, total] = await Promise.all([
      this.prisma.hospitalChargeMaster.findMany({
        where,
        skip,
        take,
        orderBy
      }),
      this.prisma.hospitalChargeMaster.count({ where })
    ]);

    return { charges, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.hospitalChargeMaster.findFirst({
      where: { id, hospitalId, isActive: true }
    });
  }

  async findByName(chargeName, hospitalId) {
    return this.prisma.hospitalChargeMaster.findFirst({
      where: { chargeName, hospitalId, isActive: true }
    });
  }

  async create(data) {
    return this.prisma.hospitalChargeMaster.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.hospitalChargeMaster.updateMany({
      where: { id, hospitalId, isActive: true },
      data
    });
  }
}

module.exports = HospitalChargesRepository;
