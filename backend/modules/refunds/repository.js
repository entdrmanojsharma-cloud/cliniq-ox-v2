/* 
  Purpose: Define Database Access Repository for Refunds.
  Responsibility: Interface with Prisma client to perform CRUD operations on refund records.
*/

class RefundsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, search }) {
    const where = { hospitalId };
    if (search) {
      where.refundNumber = { contains: search, mode: 'insensitive' };
    }

    const [refunds, total] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { patient: true }
      }),
      this.prisma.refund.count({ where })
    ]);

    return { refunds, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.refund.findFirst({
      where: { id, hospitalId },
      include: { patient: true }
    });
  }

  async create(data) {
    return this.prisma.refund.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.refund.update({
      where: { id, hospitalId },
      data
    });
  }
}

module.exports = RefundsRepository;
