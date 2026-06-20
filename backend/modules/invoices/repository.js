/* 
  Purpose: Define Database Access Repository for Invoices.
  Responsibility: Interface with Prisma client to perform CRUD operations and query totals.
*/

class InvoicesRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, status, paymentStatus, search }) {
    const where = { hospitalId };

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) {
      where.invoiceNumber = { contains: search, mode: 'insensitive' };
    }

    const [invoices, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          estimate: true
        }
      }),
      this.prisma.invoice.count({ where })
    ]);

    return { invoices, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.invoice.findFirst({
      where: { id, hospitalId },
      include: {
        patient: true,
        estimate: true,
        invoiceItems: true,
        allocations: {
          include: { receipt: true }
        },
        creditNotes: {
          include: { creditNoteItems: true }
        }
      }
    });
  }

  async create(data) {
    const { invoiceItems, ...invoiceData } = data;
    return this.prisma.invoice.create({
      data: {
        ...invoiceData,
        invoiceItems: {
          create: invoiceItems
        }
      },
      include: {
        invoiceItems: true
      }
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.invoice.update({
      where: { id, hospitalId },
      data
    });
  }

  async getInvoicedQuantityForEstimateItem(estimateItemId) {
    const aggregations = await this.prisma.invoiceItem.aggregate({
      where: {
        estimateItemId,
        invoice: {
          status: { in: ['DRAFT', 'FINALIZED'] } // Skip cancelled invoices
        }
      },
      _sum: {
        quantity: true
      }
    });
    return aggregations._sum.quantity || 0;
  }

  async getInvoicedQuantityForEstimateSurgery(estimateSurgeryId) {
    const aggregations = await this.prisma.invoiceItem.aggregate({
      where: {
        estimateSurgeryId,
        invoice: {
          status: { in: ['DRAFT', 'FINALIZED'] }
        }
      },
      _sum: {
        quantity: true
      }
    });
    return aggregations._sum.quantity || 0;
  }
}

module.exports = InvoicesRepository;
