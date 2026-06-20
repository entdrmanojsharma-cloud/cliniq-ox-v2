/* 
  Purpose: Define Business Service for Invoices.
  Responsibility: Enforce invoicing rules, perform quantity checks against estimates, and handle lifecycles.
*/

const writeAuditLog = require('../../shared/audit');
const generateSequenceNumber = require('../../shared/sequence');

class InvoicesService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getInvoices(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { invoices, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      status: query.status,
      paymentStatus: query.paymentStatus,
      search: query.search
    });

    return {
      invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getInvoiceById(id, hospitalId) {
    const invoice = await this.repository.findById(id, hospitalId);
    if (!invoice) {
      const err = new Error('Invoice not found.');
      err.status = 404;
      err.code = 'ERR_INVOICE_NOT_FOUND';
      throw err;
    }
    return invoice;
  }

  async createInvoice(hospitalId, data, userContext) {
    const { estimateId, patientId, invoiceItems } = data;

    // 1. Generate unique sequential invoice number
    const invoiceNumber = await generateSequenceNumber(this.prisma, hospitalId, 'INVOICE');

    // 2. Validate Invoice Item Sources and Quantities (Over-invoicing Protection)
    let subtotal = 0;
    const resolvedItems = [];

    for (const item of invoiceItems) {
      if (!item.estimateItemId && !item.estimateSurgeryId) {
        const err = new Error('Each invoice item must map to an estimate item or surgery.');
        err.status = 400;
        err.code = 'ERR_INVALID_ITEM_SOURCE';
        throw err;
      }
      if (item.estimateItemId && item.estimateSurgeryId) {
        const err = new Error('Invoice item cannot reference both estimate item and surgery.');
        err.status = 400;
        err.code = 'ERR_INVALID_ITEM_SOURCE';
        throw err;
      }

      let rate = Number(item.rate || 0);
      let qty = parseInt(item.quantity || 1, 10);
      let amount = rate * qty;

      if (item.estimateItemId) {
        // Query estimate item limit
        const estItem = await this.prisma.estimateItem.findUnique({
          where: { id: item.estimateItemId }
        });
        if (!estItem) {
          const err = new Error('Linked estimate item not found.');
          err.status = 404;
          err.code = 'ERR_ESTIMATE_ITEM_NOT_FOUND';
          throw err;
        }
        
        const invoicedQty = await this.repository.getInvoicedQuantityForEstimateItem(item.estimateItemId);
        if (invoicedQty + qty > estItem.quantity) {
          const err = new Error(`Quantity limit exceeded for ${estItem.description}. Maximum remaining: ${estItem.quantity - invoicedQty}`);
          err.status = 400;
          err.code = 'ERR_OVER_INVOICING';
          throw err;
        }

        resolvedItems.push({
          estimateItemId: item.estimateItemId,
          description: estItem.description,
          quantity: qty,
          rate: rate || Number(estItem.rate),
          amount: amount || Number(estItem.rate) * qty,
          hsnCode: estItem.hsnCode,
          gstRate: estItem.gstRate
        });
        subtotal += amount || Number(estItem.rate) * qty;
      } else {
        // Query estimate surgery limit
        const estSurg = await this.prisma.estimateSurgery.findUnique({
          where: { id: item.estimateSurgeryId },
          include: { surgery: true }
        });
        if (!estSurg) {
          const err = new Error('Linked estimate surgery not found.');
          err.status = 404;
          err.code = 'ERR_ESTIMATE_SURGERY_NOT_FOUND';
          throw err;
        }

        const invoicedQty = await this.repository.getInvoicedQuantityForEstimateSurgery(item.estimateSurgeryId);
        if (invoicedQty + qty > 1) {
          const err = new Error(`Surgery ${estSurg.surgery.surgeryName} has already been invoiced.`);
          err.status = 400;
          err.code = 'ERR_OVER_INVOICING';
          throw err;
        }

        resolvedItems.push({
          estimateSurgeryId: item.estimateSurgeryId,
          description: estSurg.surgery.surgeryName,
          quantity: qty,
          rate: rate || Number(estSurg.surgeryCost),
          amount: amount || Number(estSurg.surgeryCost) * qty,
          sacCode: estSurg.sacCode,
          gstRate: estSurg.gstRate
        });
        subtotal += amount || Number(estSurg.surgeryCost) * qty;
      }
    }

    // Resolve GST (keep simple estimate-level calculations for this phase)
    let gstRate = 18.00;
    if (estimateId) {
      const estimate = await this.prisma.estimate.findUnique({
        where: { id: estimateId }
      });
      if (estimate) gstRate = Number(estimate.gstRate);
    }
    const gstAmount = subtotal * (gstRate / 100);
    const grandTotal = subtotal + gstAmount;

    // 3. Create Draft Invoice
    const newInvoice = await this.repository.create({
      hospitalId,
      estimateId,
      patientId,
      invoiceNumber,
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      subtotal,
      gstAmount,
      grandTotal,
      invoiceItems: resolvedItems
    });

    // 4. Update estimate billing status
    if (estimateId) {
      await this.updateEstimateBillingStatus(estimateId);
    }

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_INVOICE',
      targetTable: 'invoices',
      targetId: newInvoice.id,
      payload: newInvoice
    });

    return newInvoice;
  }

  async updateInvoice(id, hospitalId, data, userContext) {
    const { invoiceItems } = data;

    const existing = await this.prisma.invoice.findFirst({
      where: { id, hospitalId },
      include: { invoiceItems: true }
    });
    if (!existing) {
      const err = new Error('Invoice not found.');
      err.status = 404;
      err.code = 'ERR_INVOICE_NOT_FOUND';
      throw err;
    }
    if (existing.status !== 'DRAFT') {
      const err = new Error('Only DRAFT invoices can be edited.');
      err.status = 400;
      err.code = 'ERR_INVALID_STATUS';
      throw err;
    }

    let subtotal = 0;
    const resolvedItems = [];

    for (const item of invoiceItems) {
      if (!item.estimateItemId && !item.estimateSurgeryId) {
        const err = new Error('Each invoice item must map to an estimate item or surgery.');
        err.status = 400;
        err.code = 'ERR_INVALID_ITEM_SOURCE';
        throw err;
      }
      if (item.estimateItemId && item.estimateSurgeryId) {
        const err = new Error('Invoice item cannot reference both estimate item and surgery.');
        err.status = 400;
        err.code = 'ERR_INVALID_ITEM_SOURCE';
        throw err;
      }

      let rate = Number(item.rate || 0);
      let qty = parseInt(item.quantity || 1, 10);
      let amount = rate * qty;

      if (item.estimateItemId) {
        const estItem = await this.prisma.estimateItem.findUnique({
          where: { id: item.estimateItemId }
        });
        if (!estItem) {
          const err = new Error('Linked estimate item not found.');
          err.status = 404;
          err.code = 'ERR_ESTIMATE_ITEM_NOT_FOUND';
          throw err;
        }

        const otherInvoicedQtyAgg = await this.prisma.invoiceItem.aggregate({
          where: {
            estimateItemId: item.estimateItemId,
            invoiceId: { not: id },
            invoice: {
              status: { in: ['DRAFT', 'FINALIZED'] }
            }
          },
          _sum: { quantity: true }
        });
        const otherInvoicedQty = otherInvoicedQtyAgg._sum.quantity || 0;

        if (otherInvoicedQty + qty > estItem.quantity) {
          const err = new Error(`Quantity limit exceeded for ${estItem.description}. Maximum remaining: ${estItem.quantity - otherInvoicedQty}`);
          err.status = 400;
          err.code = 'ERR_OVER_INVOICING';
          throw err;
        }

        resolvedItems.push({
          estimateItemId: item.estimateItemId,
          description: estItem.description,
          quantity: qty,
          rate: rate || Number(estItem.rate),
          amount: amount || Number(estItem.rate) * qty,
          hsnCode: estItem.hsnCode,
          gstRate: estItem.gstRate
        });
        subtotal += amount || Number(estItem.rate) * qty;
      } else {
        const estSurg = await this.prisma.estimateSurgery.findUnique({
          where: { id: item.estimateSurgeryId },
          include: { surgery: true }
        });
        if (!estSurg) {
          const err = new Error('Linked estimate surgery not found.');
          err.status = 404;
          err.code = 'ERR_ESTIMATE_SURGERY_NOT_FOUND';
          throw err;
        }

        const otherInvoicedQtyAgg = await this.prisma.invoiceItem.aggregate({
          where: {
            estimateSurgeryId: item.estimateSurgeryId,
            invoiceId: { not: id },
            invoice: {
              status: { in: ['DRAFT', 'FINALIZED'] }
            }
          },
          _sum: { quantity: true }
        });
        const otherInvoicedQty = otherInvoicedQtyAgg._sum.quantity || 0;

        if (otherInvoicedQty + qty > 1) {
          const err = new Error(`Surgery ${estSurg.surgery.surgeryName} has already been invoiced.`);
          err.status = 400;
          err.code = 'ERR_OVER_INVOICING';
          throw err;
        }

        resolvedItems.push({
          estimateSurgeryId: item.estimateSurgeryId,
          description: estSurg.surgery.surgeryName,
          quantity: qty,
          rate: rate || Number(estSurg.surgeryCost),
          amount: amount || Number(estSurg.surgeryCost) * qty,
          sacCode: estSurg.sacCode,
          gstRate: estSurg.gstRate
        });
        subtotal += amount || Number(estSurg.surgeryCost) * qty;
      }
    }

    let gstRate = 18.00;
    if (existing.estimateId) {
      const estimate = await this.prisma.estimate.findUnique({
        where: { id: existing.estimateId }
      });
      if (estimate) gstRate = Number(estimate.gstRate);
    }
    const gstAmount = subtotal * (gstRate / 100);
    const grandTotal = subtotal + gstAmount;

    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      });

      const invoice = await tx.invoice.update({
        where: { id, hospitalId },
        data: {
          subtotal,
          gstAmount,
          grandTotal,
          invoiceItems: {
            create: resolvedItems
          }
        },
        include: {
          invoiceItems: true
        }
      });

      return invoice;
    }, { timeout: 20000 });

    if (existing.estimateId) {
      await this.updateEstimateBillingStatus(existing.estimateId);
    }

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_INVOICE',
      targetTable: 'invoices',
      targetId: id,
      payload: updatedInvoice
    });

    return updatedInvoice;
  }

  async finalizeInvoice(id, hospitalId, userContext) {
    const existing = await this.getInvoiceById(id, hospitalId);
    if (existing.status !== 'DRAFT') {
      const err = new Error('Only DRAFT invoices can be finalized.');
      err.status = 400;
      err.code = 'ERR_INVALID_STATUS';
      throw err;
    }

    const updated = await this.repository.update(id, hospitalId, {
      status: 'FINALIZED'
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'FINALIZE_INVOICE',
      targetTable: 'invoices',
      targetId: id,
      payload: updated
    });

    return updated;
  }

  async cancelInvoice(id, hospitalId, userContext) {
    const existing = await this.getInvoiceById(id, hospitalId);
    if (existing.status === 'CANCELLED') {
      const err = new Error('Invoice is already cancelled.');
      err.status = 400;
      err.code = 'ERR_INVALID_STATUS';
      throw err;
    }

    // 1. Release allocations if invoice was finalized
    if (existing.status === 'FINALIZED') {
      const allocations = await this.prisma.paymentAllocation.findMany({
        where: { invoiceId: id }
      });

      for (const alloc of allocations) {
        // Return money back to the advance ledger pool
        const advBal = await this.prisma.advanceBalance.findFirst({
          where: { patientId: existing.patientId, estimateId: existing.estimateId, hospitalId }
        });
        if (advBal) {
          // Increment balance, decrement allocated
          await this.prisma.advanceBalance.update({
            where: { id: advBal.id },
            data: {
              currentBalance: { increment: Number(alloc.amountAllocated) },
              totalAllocated: { decrement: Number(alloc.amountAllocated) }
            }
          });
          // Write compensating ledger entries
          await this.prisma.advanceLedgerEntry.create({
            data: {
              advanceBalanceId: advBal.id,
              type: 'DEPOSIT', // Acts as refund/return allocation deposit
              amount: alloc.amountAllocated,
              referenceId: alloc.id
            }
          });
        }
      }

      // Delete payment allocations
      await this.prisma.paymentAllocation.deleteMany({
        where: { invoiceId: id }
      });
    }

    const updated = await this.repository.update(id, hospitalId, {
      status: 'CANCELLED',
      paymentStatus: 'UNPAID'
    });

    if (existing.estimateId) {
      await this.updateEstimateBillingStatus(existing.estimateId);
    }

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CANCEL_INVOICE',
      targetTable: 'invoices',
      targetId: id,
      payload: updated
    });

    return updated;
  }

  async updateEstimateBillingStatus(estimateId) {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        estimateItems: { where: { isActive: true } },
        estimateSurgeries: { where: { isActive: true } }
      }
    });

    if (!estimate) return;

    let totalEstimatedLines = estimate.estimateItems.length + estimate.estimateSurgeries.length;
    let fullyBilledLines = 0;
    let partiallyBilledLines = 0;

    for (const item of estimate.estimateItems) {
      const invoiced = await this.repository.getInvoicedQuantityForEstimateItem(item.id);
      if (invoiced >= item.quantity) {
        fullyBilledLines++;
      } else if (invoiced > 0) {
        partiallyBilledLines++;
      }
    }

    for (const surg of estimate.estimateSurgeries) {
      const invoiced = await this.repository.getInvoicedQuantityForEstimateSurgery(surg.id);
      if (invoiced >= 1) {
        fullyBilledLines++;
      }
    }

    let billingStatus = 'UNBILLED';
    if (fullyBilledLines === totalEstimatedLines && totalEstimatedLines > 0) {
      billingStatus = 'FULLY_BILLED';
    } else if (fullyBilledLines > 0 || partiallyBilledLines > 0) {
      billingStatus = 'PARTIALLY_BILLED';
    }

    await this.prisma.estimate.update({
      where: { id: estimateId },
      data: { billingStatus }
    });
  }
}

module.exports = InvoicesService;
