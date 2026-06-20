/* 
  Purpose: Unit tests for testing Invoices, Receipts, Refunds, Allocations, and Credit Notes.
  Responsibility: Assert correctness of over-invoicing limits, status transitions, advance ledgers, and credit note reversals.
*/

const assert = require('assert');
const InvoicesService = require('../../backend/modules/invoices/service');
const ReceiptsService = require('../../backend/modules/receipts/service');
const RefundsService = require('../../backend/modules/refunds/service');
const PaymentAllocationsService = require('../../backend/modules/payment-allocations/service');
const AdvanceBalancesService = require('../../backend/modules/advance-balances/service');
const CreditNotesService = require('../../backend/modules/credit-notes/service');

const InvoicesRepository = require('../../backend/modules/invoices/repository');
const ReceiptsRepository = require('../../backend/modules/receipts/repository');
const RefundsRepository = require('../../backend/modules/refunds/repository');
const PaymentAllocationsRepository = require('../../backend/modules/payment-allocations/repository');
const AdvanceBalancesRepository = require('../../backend/modules/advance-balances/repository');
const CreditNotesRepository = require('../../backend/modules/credit-notes/repository');

// User Context Mock
const userContext = {
  userId: 'user-789',
  email: 'billing@cliniqox.com',
  role: 'ADMIN'
};

async function runBillingTests() {
  console.log('--- Starting Billing & Invoicing Module Unit Tests ---');

  // In-memory Mock DB state
  const dbStore = {
    invoices: [],
    invoiceItems: [],
    receipts: [],
    paymentAllocations: [],
    advanceBalances: [],
    advanceLedgerEntries: [],
    refunds: [],
    creditNotes: [],
    creditNoteItems: [],
    estimateItems: [
      { id: 'est-item-1', estimateId: 'est-123', description: 'Consultation Fee', quantity: 3, rate: 500.00, gstRate: 18.00, hsnCode: 'HSN-001' },
      { id: 'est-item-2', estimateId: 'est-123', description: 'Pharmacy Pack', quantity: 1, rate: 1500.00, gstRate: 12.00, hsnCode: 'HSN-002' }
    ],
    estimateSurgeries: [
      { id: 'est-surg-1', estimateId: 'est-123', surgeryId: 'surg-1', surgeryCost: 20000.00, sacCode: 'SAC-001', gstRate: 18.00, surgery: { surgeryName: 'Appendectomy' } }
    ],
    estimates: [
      { id: 'est-123', hospitalId: 'hosp-123', estimateNumber: 'EST-2026-0001', status: 'LOCKED', billingStatus: 'UNBILLED', gstRate: 18.00 }
    ],
    hospitalProfiles: [
      { id: 'hosp-123', defaultGstRate: 18.00, estimatePrefix: 'EST', invoicePrefix: 'INV', receiptPrefix: 'REC' }
    ],
    sequences: {}
  };

  // Setup Mock Prisma Client mapping in-memory state
  const mockPrisma = {
    $transaction: async (queries) => {
      return Promise.all(queries);
    },
    hospitalProfile: {
      findUnique: async ({ where }) => dbStore.hospitalProfiles.find(p => p.id === where.id)
    },
    documentSequence: {
      upsert: async ({ where, update, create }) => {
        const key = `${where.hospitalId_documentType_year.hospitalId}_${where.hospitalId_documentType_year.documentType}_${where.hospitalId_documentType_year.year}`;
        if (!dbStore.sequences[key]) {
          dbStore.sequences[key] = { nextValue: create.nextValue };
          return { nextValue: create.nextValue - 1 };
        } else {
          dbStore.sequences[key].nextValue += 1;
          return { nextValue: dbStore.sequences[key].nextValue };
        }
      }
    },
    estimateItem: {
      findUnique: async ({ where }) => dbStore.estimateItems.find(i => i.id === where.id)
    },
    estimateSurgery: {
      findUnique: async ({ where }) => dbStore.estimateSurgeries.find(s => s.id === where.id),
      findFirst: async ({ where }) => dbStore.estimateSurgeries.find(s => s.id === where.id)
    },
    estimate: {
      findUnique: async ({ where }) => {
        const est = dbStore.estimates.find(e => e.id === where.id);
        if (est) {
          est.estimateItems = dbStore.estimateItems.filter(ei => ei.estimateId === est.id);
          est.estimateSurgeries = dbStore.estimateSurgeries.filter(es => es.estimateId === est.id);
        }
        return est;
      },
      update: async ({ where, data }) => {
        const est = dbStore.estimates.find(e => e.id === where.id);
        if (est) Object.assign(est, data);
        return est;
      }
    },
    invoiceItem: {
      aggregate: async ({ where }) => {
        const items = dbStore.invoiceItems.filter(ii => {
          const inv = dbStore.invoices.find(i => i.id === ii.invoiceId);
          if (!inv || !where.invoice.status.in.includes(inv.status)) return false;
          if (ii.estimateItemId && ii.estimateItemId === where.estimateItemId) return true;
          if (ii.estimateSurgeryId && ii.estimateSurgeryId === where.estimateSurgeryId) return true;
          return false;
        });
        const sum = items.reduce((s, item) => s + item.quantity, 0);
        return { _sum: { quantity: sum } };
      }
    },
    invoice: {
      create: async ({ data, include }) => {
        const id = `inv-${Math.random()}`;
        const { invoiceItems, ...invData } = data;
        const newInv = { id, ...invData };
        dbStore.invoices.push(newInv);
        const resolvedItems = invoiceItems.create.map(ii => {
          const item = { id: `invitem-${Math.random()}`, invoiceId: id, ...ii };
          dbStore.invoiceItems.push(item);
          return item;
        });
        newInv.invoiceItems = resolvedItems;
        newInv.allocations = [];
        newInv.creditNotes = [];
        return newInv;
      },
      update: async ({ where, data }) => {
        const inv = dbStore.invoices.find(i => i.id === where.id);
        if (inv) Object.assign(inv, data);
        return inv;
      },
      findFirst: async ({ where }) => {
        const inv = dbStore.invoices.find(i => i.id === where.id || i.invoiceNumber === where.invoiceNumber);
        if (inv) {
          inv.invoiceItems = dbStore.invoiceItems.filter(ii => ii.invoiceId === inv.id);
          inv.allocations = dbStore.paymentAllocations.filter(a => a.invoiceId === inv.id);
          inv.creditNotes = dbStore.creditNotes.filter(cn => cn.invoiceId === inv.id);
        }
        return inv;
      }
    },
    receipt: {
      create: async ({ data }) => {
        const newRec = { id: `rec-${Math.random()}`, ...data };
        dbStore.receipts.push(newRec);
        return newRec;
      },
      findFirst: async ({ where }) => dbStore.receipts.find(r => r.id === where.id || r.receiptNumber === where.receiptNumber)
    },
    paymentAllocation: {
      create: async ({ data }) => {
        const id = `alloc-${Math.random()}`;
        const newAlloc = { id, ...data };
        dbStore.paymentAllocations.push(newAlloc);
        return newAlloc;
      }
    },
    advanceBalance: {
      findUnique: async ({ where }) => {
        return dbStore.advanceBalances.find(ab => ab.patientId === where.patientId_estimateId.patientId && ab.estimateId === where.patientId_estimateId.estimateId);
      },
      findFirst: async ({ where }) => {
        return dbStore.advanceBalances.find(ab => ab.patientId === where.patientId && ab.estimateId === where.estimateId);
      },
      create: async ({ data }) => {
        const newAb = { id: `ab-${Math.random()}`, ...data };
        dbStore.advanceBalances.push(newAb);
        return newAb;
      },
      update: async ({ where, data }) => {
        const ab = dbStore.advanceBalances.find(a => a.id === where.id);
        if (ab) {
          if (data.totalDeposited && data.totalDeposited.increment) ab.totalDeposited = Number(ab.totalDeposited) + Number(data.totalDeposited.increment);
          if (data.totalAllocated && data.totalAllocated.increment) ab.totalAllocated = Number(ab.totalAllocated) + Number(data.totalAllocated.increment);
          if (data.totalRefunded && data.totalRefunded.increment) ab.totalRefunded = Number(ab.totalRefunded) + Number(data.totalRefunded.increment);
          if (data.currentBalance && data.currentBalance.increment) ab.currentBalance = Number(ab.currentBalance) + Number(data.currentBalance.increment);
        }
        return ab;
      }
    },
    advanceLedgerEntry: {
      create: async ({ data }) => {
        const newEntry = { id: `ledger-${Math.random()}`, createdAt: new Date(), ...data };
        dbStore.advanceLedgerEntries.push(newEntry);
        return newEntry;
      },
      findMany: async ({ where }) => {
        const entries = dbStore.advanceLedgerEntries.filter(e => e.advanceBalanceId === where.advanceBalanceId);
        return [...entries].sort((a, b) => b.createdAt - a.createdAt);
      }
    },
    refund: {
      create: async ({ data }) => {
        const newRef = { id: `ref-${Math.random()}`, ...data };
        dbStore.refunds.push(newRef);
        return newRef;
      },
      findFirst: async ({ where }) => dbStore.refunds.find(r => r.refundNumber === where.refundNumber)
    },
    creditNote: {
      create: async ({ data }) => {
        const id = `cn-${Math.random()}`;
        const { creditNoteItems, ...cnData } = data;
        const newCN = { id, ...cnData };
        dbStore.creditNotes.push(newCN);
        const resolvedCNItems = creditNoteItems.create.map(cni => {
          const item = { id: `cnitem-${Math.random()}`, creditNoteId: id, ...cni };
          dbStore.creditNoteItems.push(item);
          return item;
        });
        newCN.creditNoteItems = resolvedCNItems;
        return newCN;
      },
      findFirst: async ({ where }) => dbStore.creditNotes.find(c => c.creditNoteNumber === where.creditNoteNumber),
      findMany: async ({ where }) => {
        const cns = dbStore.creditNotes.filter(cn => cn.invoiceId === where.invoiceId);
        cns.forEach(cn => {
          cn.creditNoteItems = dbStore.creditNoteItems.filter(cni => cni.creditNoteId === cn.id);
        });
        return cns;
      }
    },
    auditLog: {
      create: async () => ({ id: 'audit-log-1' })
    }
  };

  // Instantiate Repositories using Mock Prisma
  const invoicesRepo = new InvoicesRepository(mockPrisma);
  const receiptsRepo = new ReceiptsRepository(mockPrisma);
  const refundsRepo = new RefundsRepository(mockPrisma);
  const paymentAllocationsRepo = new PaymentAllocationsRepository(mockPrisma);
  const advanceBalancesRepo = new AdvanceBalancesRepository(mockPrisma);
  const creditNotesRepo = new CreditNotesRepository(mockPrisma);

  // Instantiate Services
  const invoicesService = new InvoicesService(invoicesRepo, mockPrisma);
  const receiptsService = new ReceiptsService(receiptsRepo, advanceBalancesRepo, mockPrisma);
  const refundsService = new RefundsService(refundsRepo, advanceBalancesRepo, mockPrisma);
  const paymentAllocationsService = new PaymentAllocationsService(paymentAllocationsRepo, invoicesRepo, advanceBalancesRepo, mockPrisma);
  const advanceBalancesService = new AdvanceBalancesService(advanceBalancesRepo);
  const creditNotesService = new CreditNotesService(creditNotesRepo, invoicesRepo, advanceBalancesRepo, mockPrisma);

  // ==========================================
  // TEST CASE 1: Over-invoicing block constraints
  // ==========================================
  try {
    console.log('Running Test Case 1: Over-invoicing limits...');
    // A. Create Invoice taking quantity = 2 of Consultation Fee (limit is 3)
    const payloadA = {
      estimateId: 'est-123',
      patientId: 'pat-999',
      invoiceItems: [
        { estimateItemId: 'est-item-1', quantity: 2, rate: 500.00 }
      ]
    };
    const invA = await invoicesService.createInvoice('hosp-123', payloadA, userContext);
    assert.strictEqual(invA.status, 'DRAFT');
    assert.strictEqual(invA.invoiceItems[0].quantity, 2);

    // Verify estimate billing status updated to PARTIALLY_BILLED
    const estimate = dbStore.estimates.find(e => e.id === 'est-123');
    assert.strictEqual(estimate.billingStatus, 'PARTIALLY_BILLED');

    // B. Attempt to invoice quantity = 2 more of Consultation Fee (exceeds limit 3 since 2+2=4 > 3)
    const payloadB = {
      estimateId: 'est-123',
      patientId: 'pat-999',
      invoiceItems: [
        { estimateItemId: 'est-item-1', quantity: 2, rate: 500.00 }
      ]
    };
    await assert.rejects(
      invoicesService.createInvoice('hosp-123', payloadB, userContext),
      /Quantity limit exceeded/
    );

    // C. Verify double-invoicing protection on surgery
    const payloadC = {
      estimateId: 'est-123',
      patientId: 'pat-999',
      invoiceItems: [
        { estimateSurgeryId: 'est-surg-1', quantity: 1, rate: 20000.00 }
      ]
    };
    const invC = await invoicesService.createInvoice('hosp-123', payloadC, userContext);
    assert.strictEqual(invC.invoiceItems[0].quantity, 1);

    // Try to invoice the same surgery again
    await assert.rejects(
      invoicesService.createInvoice('hosp-123', payloadC, userContext),
      /has already been invoiced/
    );

    console.log('✅ Test Case 1 Passed: Over-invoicing limit constraints prevent extra invoices.');
  } catch (err) {
    console.error('❌ Test Case 1 Failed:', err);
    process.exit(1);
  }

  // ==========================================
  // TEST CASE 2: Invoice status transitions & Payment Status factoring Credit Notes
  // ==========================================
  try {
    console.log('Running Test Case 2: Invoice status transitions & payment adjustments...');
    // A. Try to apply credit note to a DRAFT invoice
    const draftInvoice = dbStore.invoices[0];
    const cnPayloadFail = {
      invoiceId: draftInvoice.id,
      reason: 'Partial discount refund',
      creditNoteItems: [
        { invoiceItemId: draftInvoice.invoiceItems[0].id, quantity: 1 }
      ]
    };
    await assert.rejects(
      creditNotesService.createCreditNote('hosp-123', cnPayloadFail, userContext),
      /Credit notes can only be issued against FINALIZED invoices/
    );

    // B. Finalize the invoice
    const finalizedInvoice = await invoicesService.finalizeInvoice(draftInvoice.id, 'hosp-123', userContext);
    assert.strictEqual(finalizedInvoice.status, 'FINALIZED');

    // C. Apply a Credit Note (partial reversal)
    // Consultation Fee grandTotal = 1000 + 18% GST = 1180.
    // Let's create credit note reversing 1 Consultation Fee (amount = 500 + GST = 590).
    const cnPayloadSuccess = {
      invoiceId: finalizedInvoice.id,
      reason: 'Patient consultation discount applied post-billing',
      creditNoteItems: [
        { invoiceItemId: finalizedInvoice.invoiceItems[0].id, quantity: 1 }
      ]
    };
    const cn = await creditNotesService.createCreditNote('hosp-123', cnPayloadSuccess, userContext);
    assert.strictEqual(cn.creditNoteItems[0].quantity, 1);
    assert.strictEqual(Number(cn.grandTotal), 590.00);

    // Outstanding balance calculations check:
    // Original grandTotal = 1180. Credit Note = 590. Outstanding = 590.
    // If patient pays 590, invoice should transition to PAID. Let's make a deposit and allocate.
    const depositPayload = {
      patientId: 'pat-999',
      estimateId: 'est-123',
      amount: 590.00,
      paymentMode: 'CASH'
    };
    const receipt = await receiptsService.createReceipt('hosp-123', depositPayload, userContext);
    assert.strictEqual(Number(receipt.amount), 590.00);

    // Allocate payment
    const alloc = await paymentAllocationsService.allocatePayment('hosp-123', {
      invoiceId: finalizedInvoice.id,
      receiptId: receipt.id,
      amountAllocated: 590.00
    }, userContext);
    assert.strictEqual(Number(alloc.amountAllocated), 590.00);

    // Check invoice payment status is now PAID (since total payments (590) + credit notes (590) = grandTotal (1180))
    const updatedInvoice = dbStore.invoices.find(i => i.id === finalizedInvoice.id);
    assert.strictEqual(updatedInvoice.paymentStatus, 'PAID');

    console.log('✅ Test Case 2 Passed: Status constraints & Credit Note ledgers computed successfully.');
  } catch (err) {
    console.error('❌ Test Case 2 Failed:', err);
    process.exit(1);
  }

  // ==========================================
  // TEST CASE 3: Advance Balances pool audit and Credit Note Overpayment Refund
  // ==========================================
  try {
    console.log('Running Test Case 3: Advance balance pool auditing & overpayment refunds...');
    // A. Check AdvanceBalance current balance
    // Deposit of 590.00 was done. Allocation of 590.00 was done. Current balance should be 0.
    const balance = await advanceBalancesService.getBalanceDetails('pat-999', 'est-123', 'hosp-123');
    assert.strictEqual(Number(balance.currentBalance), 0.00);
    assert.strictEqual(Number(balance.totalDeposited), 590.00);
    assert.strictEqual(Number(balance.totalAllocated), 590.00);

    // Let's check ledger audit history
    const history = await advanceBalancesService.getLedgerHistory('pat-999', 'est-123', 'hosp-123');
    assert.strictEqual(history.length, 2); // 1 DEPOSIT, 1 ALLOCATION
    const hasDeposit = history.some(h => h.type === 'DEPOSIT');
    const hasAllocation = history.some(h => h.type === 'ALLOCATION');
    assert.ok(hasDeposit);
    assert.ok(hasAllocation);

    // B. Test Credit Note Overpayment Refund.
    // Scenario:
    // Finalize invoice C (the surgery invoice). surgeryCost = 20000 + 18% GST = 23600.
    const finalizedInvC = await invoicesService.finalizeInvoice(dbStore.invoices[1].id, 'hosp-123', userContext);
    assert.strictEqual(finalizedInvC.status, 'FINALIZED');

    // Patient deposits 23600
    const recC = await receiptsService.createReceipt('hosp-123', {
      patientId: 'pat-999',
      estimateId: 'est-123',
      amount: 23600.00,
      paymentMode: 'ONLINE'
    }, userContext);
    assert.strictEqual(Number(recC.amount), 23600.00);

    // Allocate 23600 to invoice C
    await paymentAllocationsService.allocatePayment('hosp-123', {
      invoiceId: finalizedInvC.id,
      receiptId: recC.id,
      amountAllocated: 23600.00
    }, userContext);

    // Invoice C is now fully PAID.
    const checkInvC = dbStore.invoices.find(i => i.id === finalizedInvC.id);
    assert.strictEqual(checkInvC.paymentStatus, 'PAID');

    // Now, apply a Credit Note for 5000 + GST (5900) because the surgeon gave a rebate.
    // Since the invoice is already paid, this credit note makes the total paid + credits exceed grandTotal.
    // The service must refund the excess paid (5900) back to the Patient's AdvanceBalance pool.
    const cnC = await creditNotesService.createCreditNote('hosp-123', {
      invoiceId: finalizedInvC.id,
      reason: 'Surgeon post-op rebate',
      creditNoteItems: [
        { invoiceItemId: finalizedInvC.invoiceItems[0].id, quantity: 1 } // surgery is quantity = 1, so wait - can we credit 1 surgery? Yes, we credit the whole surgery. Wait, the rate of surgery is 20000, wait, credit Note item is rate = 20000. Wait, the CN payload requires items that were in invoiceItems.
        // Let's credit the surgery item.
      ]
    }, userContext);

    // Wait! Let's check cnC figures.
    // Surgery cost = 20000. GST = 3600. Grand total = 23600.
    // So the credit note grand total = 23600.
    // Original grandTotal = 23600. AllocationsSum = 23600. CreditNotesSum = 23600. Total payments + credits = 47200.
    // Excess = 47200 - 23600 = 23600.
    // The refundAmount must be 23600 (refunded back to advance balance pool).
    const checkBalance = await advanceBalancesService.getBalanceDetails('pat-999', 'est-123', 'hosp-123');
    // Balance deposited was 590 + 23600 = 24190.
    // Allocated was 590 + 23600 = 24190.
    // Balance was 0.
    // After credit note refund of 23600, currentBalance should become 23600!
    assert.strictEqual(Number(checkBalance.currentBalance), 23600.00);

    // Verify refund ledger entry type is DEPOSIT
    const checkHistory = await advanceBalancesService.getLedgerHistory('pat-999', 'est-123', 'hosp-123');
    const cnRefundEntry = checkHistory.find(h => h.referenceId === cnC.id);
    assert.ok(cnRefundEntry);
    assert.strictEqual(cnRefundEntry.type, 'DEPOSIT');
    assert.strictEqual(Number(cnRefundEntry.amount), 23600.00);

    // C. Perform Refund from Advance Balance pool.
    // Refund 10000 from current advance balance of 23600.
    const ref = await refundsService.createRefund('hosp-123', {
      patientId: 'pat-999',
      estimateId: 'est-123',
      amount: 10000.00,
      paymentMode: 'BANK_TRANSFER',
      reason: 'Refunding excess payment'
    }, userContext);
    assert.strictEqual(Number(ref.amount), 10000.00);

    const checkBalancePostRefund = await advanceBalancesService.getBalanceDetails('pat-999', 'est-123', 'hosp-123');
    // Balance should be 23600 - 10000 = 13600.
    assert.strictEqual(Number(checkBalancePostRefund.currentBalance), 13600.00);
    assert.strictEqual(Number(checkBalancePostRefund.totalRefunded), 10000.00);

    console.log('✅ Test Case 3 Passed: Advance balance ledger auditing & overpayment CN refunds works perfectly.');
  } catch (err) {
    console.error('❌ Test Case 3 Failed:', err);
    process.exit(1);
  }

  console.log('--- All Billing & Invoicing Module Unit Tests Passed Successfully ---');
}

runBillingTests();
