/* 
  Purpose: Define Business Service for Credit Notes.
  Responsibility: Enforce credit notes rules, prevent over-crediting, calculate reversals, and refund excess allocations.
*/

const writeAuditLog = require('../../shared/audit');
const generateSequenceNumber = require('../../shared/sequence');

class CreditNotesService {
  constructor(repository, invoiceRepo, advanceBalanceRepo, prisma) {
    this.repository = repository;
    this.invoiceRepo = invoiceRepo;
    this.advanceBalanceRepo = advanceBalanceRepo;
    this.prisma = prisma;
  }

  async getCreditNotes(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { creditNotes, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      search: query.search
    });

    return {
      creditNotes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getCreditNoteById(id, hospitalId) {
    const creditNote = await this.repository.findById(id, hospitalId);
    if (!creditNote) {
      const err = new Error('Credit Note not found.');
      err.status = 404;
      err.code = 'ERR_CREDIT_NOTE_NOT_FOUND';
      throw err;
    }
    return creditNote;
  }

  async createCreditNote(hospitalId, data, userContext) {
    const { invoiceId, reason, creditNoteItems } = data;

    // 1. Fetch invoice details and validate status
    const invoice = await this.invoiceRepo.findById(invoiceId, hospitalId);
    if (!invoice) {
      const err = new Error('Target invoice not found.');
      err.status = 404;
      err.code = 'ERR_INVOICE_NOT_FOUND';
      throw err;
    }
    if (invoice.status !== 'FINALIZED') {
      const err = new Error('Credit notes can only be issued against FINALIZED invoices.');
      err.status = 400;
      err.code = 'ERR_INVALID_STATUS';
      throw err;
    }

    // 2. Fetch existing credit notes for this invoice to verify remaining credit limits
    const existingCNs = await this.repository.findManyByInvoiceId(invoiceId);

    // Helper map of credited quantities
    const creditedQtyMap = {};
    existingCNs.forEach(cn => {
      cn.creditNoteItems.forEach(item => {
        creditedQtyMap[item.invoiceItemId] = (creditedQtyMap[item.invoiceItemId] || 0) + item.quantity;
      });
    });

    let subtotal = 0;
    const resolvedItems = [];

    // 3. Validate credit note items against original invoice items
    for (const item of creditNoteItems) {
      const invItem = invoice.invoiceItems.find(ii => ii.id === item.invoiceItemId);
      if (!invItem) {
        const err = new Error('Linked invoice item not found in invoice.');
        err.status = 404;
        err.code = 'ERR_INVOICE_ITEM_NOT_FOUND';
        throw err;
      }

      const qtyToCredit = parseInt(item.quantity || 1, 10);
      const alreadyCredited = creditedQtyMap[item.invoiceItemId] || 0;

      if (alreadyCredited + qtyToCredit > invItem.quantity) {
        const err = new Error(`Credit quantity limit exceeded for ${invItem.description}. Maximum remaining: ${invItem.quantity - alreadyCredited}`);
        err.status = 400;
        err.code = 'ERR_OVER_CREDITING';
        throw err;
      }

      let rate = Number(invItem.rate);
      let amount = rate * qtyToCredit;
      let itemGstRate = invItem.gstRate ? Number(invItem.gstRate) : 18.00;
      let itemGstAmount = amount * (itemGstRate / 100);

      resolvedItems.push({
        invoiceItemId: item.invoiceItemId,
        description: invItem.description,
        quantity: qtyToCredit,
        rate,
        amount,
        gstRate: itemGstRate,
        gstAmount: itemGstAmount
      });

      subtotal += amount;
    }

    // 4. Calculate total credit note figures
    const invoiceGstRate = Number(invoice.subtotal) > 0 ? (Number(invoice.gstAmount) / Number(invoice.subtotal)) * 100 : 18.00;
    const gstAmount = subtotal * (invoiceGstRate / 100);
    const grandTotal = subtotal + gstAmount;

    // 5. Generate unique sequential credit note number
    const creditNoteNumber = await generateSequenceNumber(this.prisma, hospitalId, 'CREDIT_NOTE');

    // 6. Create Credit Note record
    const newCreditNote = await this.repository.create({
      hospitalId,
      invoiceId,
      creditNoteNumber,
      reason,
      subtotal,
      gstAmount,
      grandTotal,
      creditNoteItems: resolvedItems
    });

    // 7. Calculate new balances and check for overpayment/refund requirements
    const allocationsSum = invoice.allocations.reduce((sum, a) => sum + Number(a.amountAllocated), 0);
    const creditNotesSum = existingCNs.reduce((sum, cn) => sum + Number(cn.grandTotal), 0) + grandTotal;
    const totalPaymentsAndCredits = allocationsSum + creditNotesSum;

    if (totalPaymentsAndCredits > Number(invoice.grandTotal)) {
      // Refund the excess paid amount back to the patient's AdvanceBalance pool
      const excess = totalPaymentsAndCredits - Number(invoice.grandTotal);
      const refundAmount = Math.min(excess, allocationsSum); // Refund up to total payments made

      if (refundAmount > 0) {
        const advBal = await this.advanceBalanceRepo.findOrCreate(invoice.patientId, invoice.estimateId, hospitalId);
        
        await this.advanceBalanceRepo.updateBalance(advBal.id, {
          currentBalance: refundAmount,
          totalAllocated: -refundAmount // Reduce allocated total
        });

        // Write compensating ledger deposit entry
        await this.advanceBalanceRepo.createLedgerEntry({
          advanceBalanceId: advBal.id,
          type: 'DEPOSIT', // Deposited back to balance
          amount: refundAmount,
          referenceId: newCreditNote.id
        });
      }
    }

    // 8. Update Invoice payment lifecycle status
    let paymentStatus = 'UNPAID';
    if (totalPaymentsAndCredits >= Number(invoice.grandTotal)) {
      paymentStatus = 'PAID';
    } else if (totalPaymentsAndCredits > 0) {
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
      action: 'CREATE_CREDIT_NOTE',
      targetTable: 'credit_notes',
      targetId: newCreditNote.id,
      payload: newCreditNote
    });

    return newCreditNote;
  }
}

module.exports = CreditNotesService;
