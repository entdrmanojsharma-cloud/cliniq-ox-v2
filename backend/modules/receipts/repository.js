/* 
  Purpose: Define Database Access Repository for Receipts.
  Responsibility: Interface with Prisma client to perform CRUD operations on receipt rows.
*/

class ReceiptsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, search, patientId }) {
    const where = { hospitalId };
    if (search) {
      where.receiptNumber = { contains: search, mode: 'insensitive' };
    }
    if (patientId) {
      where.patientId = patientId;
    }

    const [receipts, total] = await this.prisma.$transaction([
      this.prisma.receipt.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { patient: true }
      }),
      this.prisma.receipt.count({ where })
    ]);

    return { receipts, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.receipt.findFirst({
      where: { id, hospitalId },
      include: {
        patient: true,
        allocations: {
          include: { invoice: true }
        }
      }
    });
  }

  async create(data) {
    return this.prisma.receipt.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.receipt.update({
      where: { id, hospitalId },
      data
    });
  }
}

module.exports = ReceiptsRepository;
