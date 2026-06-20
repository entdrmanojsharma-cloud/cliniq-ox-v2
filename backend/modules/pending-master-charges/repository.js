/* 
  Purpose: Data Access Object for the Pending Master Charges Module.
  Responsibility: Provide interface for querying pending charges, proposing new records, and executing approval transactions.
*/

class PendingMasterChargesRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, sortBy, sortOrder, status }) {
    const where = {
      hospitalId,
      isActive: true,
      ...(status && { status })
    };

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' };

    const [charges, total] = await Promise.all([
      this.prisma.pendingMasterCharge.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          creator: {
            select: { username: true }
          }
        }
      }),
      this.prisma.pendingMasterCharge.count({ where })
    ]);

    return { charges, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.pendingMasterCharge.findFirst({
      where: { id, hospitalId, isActive: true }
    });
  }

  async create(data) {
    return this.prisma.pendingMasterCharge.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.pendingMasterCharge.updateMany({
      where: { id, hospitalId, isActive: true },
      data
    });
  }

  // Transactional promotion to active charges
  async approveAndPromote(id, hospitalId, pendingData, activeData) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update pending charge status
      await tx.pendingMasterCharge.updateMany({
        where: { id, hospitalId, isActive: true },
        data: pendingData
      });

      // 2. Insert into HospitalChargeMaster
      const promoted = await tx.hospitalChargeMaster.create({
        data: activeData
      });

      return promoted;
    }, { timeout: 20000 });
  }
}

module.exports = PendingMasterChargesRepository;
