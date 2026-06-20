/* 
  Purpose: Business service orchestration layer for the reports module.
  Responsibility: Map surgery data and billing reports, calculate fees, and generate CSV outputs.
*/

class ReportsService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  _parseDateRange(from, to) {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // start of month
    let end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // end of month

    if (from) {
      const parsed = new Date(from);
      if (!isNaN(parsed)) start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
    }
    if (to) {
      const parsed = new Date(to);
      if (!isNaN(parsed)) end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
    }
    return { start, end };
  }

  async getSurgeryReport(hospitalId, { from, to }) {
    const range = this._parseDateRange(from, to);
    const events = await this.repository.getSurgeryData(hospitalId, range);
    const billingDefaults = await this.prisma.billingDefaults.findUnique({
      where: { hospitalId }
    });
    const assistantDefault = billingDefaults ? Number(billingDefaults.assistantSurgeonCharge || 0) : 0;

    const report = events.map(event => {
      const est = event.estimate || {};
      
      // Calculate surgeon fees (sum of surgery costs)
      let surgeonFee = 0;
      const surgeriesList = [];
      if (est.estimateSurgeries) {
        for (const surg of est.estimateSurgeries) {
          surgeonFee += Number(surg.finalAmount || 0);
          if (surg.surgery?.surgeryName) {
            surgeriesList.push(surg.surgery.surgeryName);
          }
        }
      }
      if (surgeriesList.length === 0 && event.title) {
        surgeriesList.push(event.title);
      }

      // Calculate assistant surgeon fee
      let assistantFee = 0;
      let hasAssistantItem = false;
      if (est.estimateItems) {
        for (const item of est.estimateItems) {
          const desc = (item.description || '').toLowerCase();
          const cat = (item.chargeCategory || '').toLowerCase();
          if (desc.includes('assistant surgeon') || cat.includes('assistant surgeon')) {
            assistantFee += Number(item.amount || 0);
            hasAssistantItem = true;
          }
        }
      }
      if (!hasAssistantItem && event.assistantSurgeonId) {
        assistantFee = assistantDefault;
      }

      return {
        eventId: event.id,
        date: event.startTime.toISOString().split('T')[0],
        patientName: event.patient?.name || 'N/A',
        uhid: event.patient?.uhid || 'N/A',
        surgeries: surgeriesList.join('; '),
        surgeonName: event.doctor ? `Dr. ${event.doctor.firstName} ${event.doctor.lastName}` : 'N/A',
        assistantSurgeonName: event.assistantSurgeon ? `Dr. ${event.assistantSurgeon.firstName} ${event.assistantSurgeon.lastName}` : 'N/A',
        surgeonFee,
        assistantSurgeonFee: assistantFee,
        totalCost: Number(event.surgeryCost || 0)
      };
    });

    return report;
  }

  async getBillingReport(hospitalId, { from, to }) {
    const range = this._parseDateRange(from, to);
    const invoices = await this.repository.getBillingData(hospitalId, range);

    const report = invoices.map(inv => {
      const surgDr = inv.estimate?.surgeon;
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.createdAt.toISOString().split('T')[0],
        patientName: inv.patient?.name || 'N/A',
        uhid: inv.patient?.uhid || 'N/A',
        surgeonName: surgDr ? `Dr. ${surgDr.firstName} ${surgDr.lastName}` : 'N/A',
        subtotal: Number(inv.subtotal || 0),
        gstAmount: Number(inv.gstAmount || 0),
        grandTotal: Number(inv.grandTotal || 0),
        status: inv.status
      };
    });

    return report;
  }

  convertToCsv(data, headers) {
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header] === undefined || row[header] === null ? '' : row[header];
        // Replace newlines and wrap in quotes
        const escaped = ('' + val).replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  }
}

module.exports = ReportsService;
