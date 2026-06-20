/* 
  Purpose: Define Database Access Repository for Advance Balances.
  Responsibility: Interface with Prisma client to perform CRUD operations on advance balances and ledger entries.
*/

class AdvanceBalancesRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findOrCreate(patientId, estimateId, hospitalId) {
    const estId = estimateId || null;
    const existing = await this.prisma.advanceBalance.findFirst({
      where: {
        patientId,
        estimateId: estId
      },
      include: {
        ledgerEntries: true
      }
    });

    if (existing) return existing;

    return this.prisma.advanceBalance.create({
      data: {
        hospitalId,
        patientId,
        estimateId: estId,
        totalDeposited: 0.00,
        totalAllocated: 0.00,
        totalRefunded: 0.00,
        currentBalance: 0.00
      },
      include: {
        ledgerEntries: true
      }
    });
  }

  async findById(id) {
    return this.prisma.advanceBalance.findUnique({
      where: { id },
      include: {
        ledgerEntries: true,
        patient: true,
        estimate: true
      }
    });
  }

  async createLedgerEntry(data) {
    return this.prisma.advanceLedgerEntry.create({
      data
    });
  }

  async updateBalance(id, { totalDeposited, totalAllocated, totalRefunded, currentBalance }) {
    const data = {};
    if (totalDeposited !== undefined) data.totalDeposited = { increment: totalDeposited };
    if (totalAllocated !== undefined) data.totalAllocated = { increment: totalAllocated };
    if (totalRefunded !== undefined) data.totalRefunded = { increment: totalRefunded };
    if (currentBalance !== undefined) data.currentBalance = { increment: currentBalance };

    return this.prisma.advanceBalance.update({
      where: { id },
      data,
      include: {
        ledgerEntries: true
      }
    });
  }

  async getLedgerEntries(advanceBalanceId) {
    return this.prisma.advanceLedgerEntry.findMany({
      where: { advanceBalanceId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = AdvanceBalancesRepository;
