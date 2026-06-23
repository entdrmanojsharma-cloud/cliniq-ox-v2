class DashboardService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  _parseDateRange(from, to) {
    const now = new Date();

    // Default: today
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (from) {
      const parsed = new Date(from);
      if (!isNaN(parsed)) {
        start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
      }
    }
    if (to) {
      const parsed = new Date(to);
      if (!isNaN(parsed)) {
        end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
      }
    }

    return { start, end };
  }

  async getStats(hospitalId, { from, to }) {
    const { start, end } = this._parseDateRange(from, to);
    const dateFilter = { gte: start, lte: end };

    const [
      patientCount,
      totalPatientCount,
      estimateCount,
      estimateSum,
      invoiceCount,
      invoiceSum,
      receiptCount,
      receiptSum,
      pendingEstimatesCount,
      approvedEstimates,
      billingDefaults
    ] = await Promise.all([
      // Patients — count only in period
      this.prisma.patient.count({
        where: { hospitalId, isActive: true, createdAt: dateFilter }
      }),

      // Patients - count total
      this.prisma.patient.count({
        where: { hospitalId, isActive: true }
      }),

      // Estimates — count
      this.prisma.estimate.count({
        where: { hospitalId, createdAt: dateFilter }
      }),

      // Estimates — sum grandTotal
      this.prisma.estimate.aggregate({
        where: { hospitalId, createdAt: dateFilter },
        _sum: { grandTotal: true }
      }),

      // Invoices — count
      this.prisma.invoice.count({
        where: { hospitalId, status: { not: 'CANCELLED' }, createdAt: dateFilter }
      }),

      // Invoices — sum grandTotal (exclude cancelled)
      this.prisma.invoice.aggregate({
        where: { hospitalId, status: { not: 'CANCELLED' }, createdAt: dateFilter },
        _sum: { grandTotal: true }
      }),

      // Receipts — count
      this.prisma.receipt.count({
        where: { hospitalId, status: 'ACTIVE', createdAt: dateFilter }
      }),

      // Receipts — sum amount
      this.prisma.receipt.aggregate({
        where: { hospitalId, status: 'ACTIVE', createdAt: dateFilter },
        _sum: { amount: true }
      }),

      // Estimates pending approval count (total active)
      this.prisma.estimate.count({
        where: { hospitalId, status: 'PENDING_APPROVAL', isActive: true }
      }),

      // Approved / Locked estimates in period to calculate doctor fees
      this.prisma.estimate.findMany({
        where: {
          hospitalId,
          status: { in: ['APPROVED', 'LOCKED'] },
          isActive: true,
          createdAt: dateFilter
        },
        include: {
          event: true,
          estimateSurgeries: true,
          estimateItems: true
        }
      }),

      // Billing defaults to get assistant surgeon fee fallback
      this.prisma.billingDefaults.findUnique({
        where: { hospitalId }
      })
    ]);

    // Calculate surgeon & assistant surgeon fees in memory
    let surgeonFees = 0;
    let assistantSurgeonFees = 0;
    const assistantDefault = billingDefaults ? Number(billingDefaults.assistantSurgeonCharge || 0) : 0;

    for (const est of approvedEstimates) {
      // 1. Surgeon fees (sum of surgery costs)
      for (const surg of est.estimateSurgeries) {
        surgeonFees += Number(surg.finalAmount || 0);
      }

      // 2. Assistant Surgeon fees
      let hasAssistantItem = false;
      for (const item of est.estimateItems) {
        const desc = (item.description || '').toLowerCase();
        const cat = (item.chargeCategory || '').toLowerCase();
        if (desc.includes('assistant surgeon') || cat.includes('assistant surgeon')) {
          assistantSurgeonFees += Number(item.amount || 0);
          hasAssistantItem = true;
        }
      }

      // Fallback to billing defaults if event has assistant doctor but estimate items do not specify it
      if (!hasAssistantItem && est.event && est.event.assistantSurgeonId) {
        assistantSurgeonFees += assistantDefault;
      }
    }

    return {
      period: {
        from: start.toISOString().split('T')[0],
        to:   end.toISOString().split('T')[0],
      },
      patients: {
        count: patientCount,
        totalCount: totalPatientCount
      },
      estimates: {
        count:      estimateCount,
        totalValue: Number(estimateSum._sum.grandTotal || 0),
        pendingCount: pendingEstimatesCount
      },
      invoices: {
        count:      invoiceCount,
        totalValue: Number(invoiceSum._sum.grandTotal || 0),
      },
      receipts: {
        count:      receiptCount,
        totalValue: Number(receiptSum._sum.amount || 0),
      },
      fees: {
        surgeon: surgeonFees,
        assistantSurgeon: assistantSurgeonFees
      }
    };
  }
}

module.exports = DashboardService;
