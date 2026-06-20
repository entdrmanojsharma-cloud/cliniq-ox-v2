/* 
  Purpose: Database access repository for the reports module.
  Responsibility: Handle Prisma queries and database schema actions for reports.
*/

class ReportsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getSurgeryData(hospitalId, { start, end }) {
    return this.prisma.calendarEvent.findMany({
      where: {
        hospitalId,
        eventType: 'SURGERY',
        isActive: true,
        startTime: { gte: start, lte: end }
      },
      include: {
        doctor: true,
        assistantSurgeon: true,
        patient: true,
        estimate: {
          include: {
            estimateSurgeries: {
              include: {
                surgery: true
              }
            },
            estimateItems: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  async getBillingData(hospitalId, { start, end }) {
    return this.prisma.invoice.findMany({
      where: {
        hospitalId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: start, lte: end }
      },
      include: {
        patient: true,
        invoiceItems: true,
        estimate: {
          include: {
            surgeon: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}

module.exports = ReportsRepository;
