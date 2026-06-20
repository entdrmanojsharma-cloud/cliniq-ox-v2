/* 
  Purpose: Define Database Access Repository for Payment Allocations.
  Responsibility: Interface with Prisma client to perform CRUD operations on payment allocations.
*/

class PaymentAllocationsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.paymentAllocation.create({
      data,
      include: {
        invoice: true,
        receipt: true
      }
    });
  }

  async findManyByInvoiceId(invoiceId) {
    return this.prisma.paymentAllocation.findMany({
      where: { invoiceId },
      include: { receipt: true }
    });
  }

  async findManyByReceiptId(receiptId) {
    return this.prisma.paymentAllocation.findMany({
      where: { receiptId },
      include: { invoice: true }
    });
  }

  async delete(invoiceId, receiptId) {
    return this.prisma.paymentAllocation.delete({
      where: {
        invoiceId_receiptId: { invoiceId, receiptId }
      }
    });
  }
}

module.exports = PaymentAllocationsRepository;
