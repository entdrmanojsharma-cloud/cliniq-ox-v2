/* 
  Purpose: Define Business Service for Payment Allocations.
  Responsibility: Validate allocations against outstanding dues and advance balances, and update payment statuses.
*/

const writeAuditLog = require('../../shared/audit');

class PaymentAllocationsService {
  constructor(repository, invoiceRepo, advanceBalanceRepo, prisma) {
    this.repository = repository;
    this.invoiceRepo = invoiceRepo;
    this.advanceBalanceRepo = advanceBalanceRepo;
    this.prisma = prisma;
  }

  async allocatePayment(hospitalId, data, userContext) {
    const { invoiceId, receiptId, amountAllocated } = data;
    const allocationAmount = Number(amountAllocated || 0);

    if (allocationAmount <= 0) {
      const err = new Error('Allocation amount must be positive.');
      err.status = 400;
      err.code = 'ERR_INVALID_AMOUNT';
      throw err;
    }

    // 1. Fetch Invoice details and validate status
    const invoice = await this.invoiceRepo.findById(invoiceId, hospitalId);
    if (!invoice) {
      const err = new Error('Target invoice not found.');
      err.status = 404;
      err.code = 'ERR_INVOICE_NOT_FOUND';
      throw err;
    }
    if (invoice.status !== 'FINALIZED') {
      const err = new Error('Payments can only be allocated to FINALIZED invoices.');
      err.status = 400;
      err.code = 'ERR_INVALID_STATUS';
      throw err;
    }

    // 2. Fetch Receipt details and validate status
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, hospitalId }
    });
    if (!receipt || receipt.status !== 'ACTIVE') {
      const err = new Error('Receipt not active or not found.');
      err.status = 400;
      err.code = 'ERR_RECEIPT_NOT_ACTIVE';
      throw err;
    }

    // 3. Resolve Patient AdvanceBalance pool
    const advBalance = await this.advanceBalanceRepo.findOrCreate(invoice.patientId, invoice.estimateId, hospitalId);
    if (Number(advBalance.currentBalance) < allocationAmount) {
      const err = new Error(`Insufficient advance balance available. Active: ${advBalance.currentBalance}`);
      err.status = 400;
      err.code = 'ERR_INSUFFICIENT_ADVANCE_BALANCE';
      throw err;
    }

    // 4. Calculate Invoice outstanding balance due (considering Credit Notes)
    const allocationsSum = invoice.allocations.reduce((sum, a) => sum + Number(a.amountAllocated), 0);
    const creditNotesSum = invoice.creditNotes.reduce((sum, cn) => sum + Number(cn.grandTotal), 0);
    const totalPaymentsAndCredits = allocationsSum + creditNotesSum;
    const remainingDue = Number(invoice.grandTotal) - totalPaymentsAndCredits;

    if (allocationAmount > remainingDue) {
      const err = new Error(`Allocation amount exceeds outstanding invoice balance. Remaining due: ${remainingDue}`);
      err.status = 400;
      err.code = 'ERR_EXCESSIVE_ALLOCATION';
      throw err;
    }

    // 5. Create PaymentAllocation record
    const allocation = await this.repository.create({
      invoiceId,
      receiptId,
      amountAllocated: allocationAmount
    });

    // 6. Update AdvanceBalance ledger amounts
    await this.advanceBalanceRepo.updateBalance(advBalance.id, {
      totalAllocated: allocationAmount,
      currentBalance: -allocationAmount // Deduct from available balance
    });

    // Write allocation ledger entry
    await this.advanceBalanceRepo.createLedgerEntry({
      advanceBalanceId: advBalance.id,
      type: 'ALLOCATION',
      amount: allocationAmount,
      referenceId: allocation.id
    });

    // 7. Update Invoice Payment Status
    const newTotalPaidAndCredited = totalPaymentsAndCredits + allocationAmount;
    let paymentStatus = 'UNPAID';
    if (newTotalPaidAndCredited >= Number(invoice.grandTotal)) {
      paymentStatus = 'PAID';
    } else if (newTotalPaidAndCredited > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    await this.invoiceRepo.update(invoiceId, hospitalId, {
      paymentStatus
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'ALLOCATE_PAYMENT',
      targetTable: 'payment_allocations',
      targetId: allocation.id,
      payload: allocation
    });

    return allocation;
  }
}

module.exports = PaymentAllocationsService;
