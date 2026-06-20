/* 
  Purpose: Define Business Service for Refunds.
  Responsibility: Validate refund limits against patient Advance Balance pools, generate serials, and write entries.
*/

const writeAuditLog = require('../../shared/audit');
const generateSequenceNumber = require('../../shared/sequence');

class RefundsService {
  constructor(repository, advanceBalanceRepo, prisma) {
    this.repository = repository;
    this.advanceBalanceRepo = advanceBalanceRepo;
    this.prisma = prisma;
  }

  async getRefunds(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { refunds, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      search: query.search
    });

    return {
      refunds,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getRefundById(id, hospitalId) {
    const refund = await this.repository.findById(id, hospitalId);
    if (!refund) {
      const err = new Error('Refund not found.');
      err.status = 404;
      err.code = 'ERR_REFUND_NOT_FOUND';
      throw err;
    }
    return refund;
  }

  async createRefund(hospitalId, data, userContext) {
    const { patientId, estimateId, amount, paymentMode, transactionRef, reason } = data;
    const refundAmount = Number(amount || 0);

    if (refundAmount <= 0) {
      const err = new Error('Refund amount must be positive.');
      err.status = 400;
      err.code = 'ERR_INVALID_AMOUNT';
      throw err;
    }

    // 1. Verify available AdvanceBalance
    const advBalance = await this.advanceBalanceRepo.findOrCreate(patientId, estimateId, hospitalId);
    if (Number(advBalance.currentBalance) < refundAmount) {
      const err = new Error(`Insufficient advance balance. Available: ${advBalance.currentBalance}`);
      err.status = 400;
      err.code = 'ERR_INSUFFICIENT_BALANCE';
      throw err;
    }

    // 2. Generate unique sequential refund number
    const refundNumber = await generateSequenceNumber(this.prisma, hospitalId, 'REFUND');

    // 3. Create Refund Record
    const newRefund = await this.repository.create({
      hospitalId,
      patientId,
      refundNumber,
      amount: refundAmount,
      paymentMode,
      transactionRef,
      status: 'COMPLETED',
      reason
    });

    // 4. Update AdvanceBalance values
    await this.advanceBalanceRepo.updateBalance(advBalance.id, {
      totalRefunded: refundAmount,
      currentBalance: -refundAmount // Deduct from available balance
    });

    // Create refund ledger entry
    await this.advanceBalanceRepo.createLedgerEntry({
      advanceBalanceId: advBalance.id,
      type: 'REFUND',
      amount: refundAmount,
      referenceId: newRefund.id
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_REFUND',
      targetTable: 'refunds',
      targetId: newRefund.id,
      payload: newRefund
    });

    return newRefund;
  }
}

module.exports = RefundsService;
