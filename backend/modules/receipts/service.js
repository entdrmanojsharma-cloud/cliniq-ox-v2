/* 
  Purpose: Define Business Service for Receipts.
  Responsibility: Enforce receipts creation rules, generate serials, and automatically update patient Advance Balance ledgers.
*/

const writeAuditLog = require('../../shared/audit');
const generateSequenceNumber = require('../../shared/sequence');

class ReceiptsService {
  constructor(repository, advanceBalanceRepo, prisma) {
    this.repository = repository;
    this.advanceBalanceRepo = advanceBalanceRepo;
    this.prisma = prisma;
  }

  async getReceipts(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { receipts, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      search: query.search,
      patientId: query.patientId
    });

    return {
      receipts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getReceiptById(id, hospitalId) {
    const receipt = await this.repository.findById(id, hospitalId);
    if (!receipt) {
      const err = new Error('Receipt not found.');
      err.status = 404;
      err.code = 'ERR_RECEIPT_NOT_FOUND';
      throw err;
    }
    return receipt;
  }

  async createReceipt(hospitalId, data, userContext) {
    const { patientId, estimateId, amount, paymentMode, transactionRef, remarks } = data;
    const receiptAmount = Number(amount || 0);

    if (receiptAmount <= 0) {
      const err = new Error('Receipt amount must be positive.');
      err.status = 400;
      err.code = 'ERR_INVALID_AMOUNT';
      throw err;
    }

    // 1. Generate unique sequential receipt number
    const receiptNumber = await generateSequenceNumber(this.prisma, hospitalId, 'RECEIPT');

    // 2. Create Receipt
    const newReceipt = await this.repository.create({
      hospitalId,
      patientId,
      receiptNumber,
      amount: receiptAmount,
      paymentMode,
      transactionRef,
      status: 'ACTIVE',
      remarks
    });

    // 3. Atomically update patient AdvanceBalance ledger
    const advBalance = await this.advanceBalanceRepo.findOrCreate(patientId, estimateId, hospitalId);
    
    await this.advanceBalanceRepo.updateBalance(advBalance.id, {
      totalDeposited: receiptAmount,
      currentBalance: receiptAmount
    });

    // Create deposit ledger entry
    await this.advanceBalanceRepo.createLedgerEntry({
      advanceBalanceId: advBalance.id,
      type: 'DEPOSIT',
      amount: receiptAmount,
      referenceId: newReceipt.id
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_RECEIPT',
      targetTable: 'receipts',
      targetId: newReceipt.id,
      payload: newReceipt
    });

    return newReceipt;
  }
}

module.exports = ReceiptsService;
