/* 
  Purpose: Business service orchestration layer for the Documents Module.
  Responsibility: Prepares transaction contexts, runs the HTML template engine, triggers HTML-to-PDF rendering, and updates archival records.
*/

const puppeteer = require('puppeteer');
const writeAuditLog = require('../../shared/audit');

const renderEstimate = require('./templates/estimate');
const renderInvoice = require('./templates/invoice');
const renderReceipt = require('./templates/receipt');
const renderConsent = require('./templates/consent');

class DocumentsService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async generateDocument(hospitalId, data, userContext) {
    const { documentType, targetId, isPrintPreview } = data;

    // 1. Fetch Hospital Profile
    const hospital = await this.prisma.hospitalProfile.findUnique({
      where: { id: hospitalId }
    });
    if (!hospital) {
      const err = new Error('Hospital profile details not established.');
      err.status = 404;
      err.code = 'ERR_HOSPITAL_NOT_FOUND';
      throw err;
    }

    // 2. Fetch Target Data Graph & Map placeholders for compatibility
    let templateData = null;

    if (documentType === 'ESTIMATE') {
      const estimate = await this.repository.getEstimateGraph(targetId, hospitalId);
      if (!estimate) {
        const err = new Error('Target estimate record not found.');
        err.status = 404;
        err.code = 'ERR_TARGET_NOT_FOUND';
        throw err;
      }
      templateData = {
        ...estimate,
        hospital,
        patient: estimate.event?.patient || {},
        doctor: estimate.surgeon || estimate.event?.doctor || {},
        surgeries: estimate.estimateSurgeries || [],
        items: estimate.estimateItems || []
      };
    } else {
      if (documentType === 'INVOICE') {
        const invoice = await this.prisma.invoice.findFirst({
          where: { id: targetId, hospitalId },
          include: {
            patient: true,
            invoiceItems: true
          }
        });
        if (!invoice) {
          const err = new Error('Target invoice record not found.');
          err.status = 404;
          err.code = 'ERR_TARGET_NOT_FOUND';
          throw err;
        }

        templateData = {
          invoiceNumber: invoice.invoiceNumber,
          hospital,
          patient: invoice.patient,
          createdAt: invoice.createdAt,
          status: invoice.status,
          items: invoice.invoiceItems.map(ii => ({
            description: ii.description,
            quantity: ii.quantity,
            rate: Number(ii.rate),
            amount: Number(ii.amount)
          })),
          subtotal: Number(invoice.subtotal),
          gstAmount: Number(invoice.gstAmount),
          grandTotal: Number(invoice.grandTotal)
        };
      } else if (documentType === 'RECEIPT') {
        const receipt = await this.prisma.receipt.findFirst({
          where: { id: targetId, hospitalId },
          include: {
            patient: true,
            allocations: {
              include: {
                invoice: true
              }
            }
          }
        });
        if (!receipt) {
          const err = new Error('Target receipt record not found.');
          err.status = 404;
          err.code = 'ERR_TARGET_NOT_FOUND';
          throw err;
        }

        const invoiceNumber = receipt.allocations?.[0]?.invoice?.invoiceNumber || 'N/A';

        templateData = {
          receiptNumber: receipt.receiptNumber,
          invoiceNumber: invoiceNumber,
          hospital,
          patient: receipt.patient,
          createdAt: receipt.createdAt,
          paymentMode: receipt.paymentMode,
          transactionRef: receipt.transactionRef,
          remarks: receipt.remarks,
          amountPaid: Number(receipt.amount)
        };
      } else if (documentType === 'CONSENT_FORM') {
        const estimate = await this.repository.getEstimateGraph(targetId, hospitalId);
        if (!estimate) {
          const err = new Error('Target transaction details not found.');
          err.status = 404;
          err.code = 'ERR_TARGET_NOT_FOUND';
          throw err;
        }
        templateData = {
          hospital,
          patient: estimate.event.patient,
          doctor: estimate.event.doctor
        };
      }
    }

    // 3. Render HTML template
    let htmlContent = '';
    switch (documentType) {
      case 'ESTIMATE':
        htmlContent = renderEstimate(templateData);
        break;
      case 'INVOICE':
        htmlContent = renderInvoice(templateData);
        break;
      case 'RECEIPT':
        htmlContent = renderReceipt(templateData);
        break;
      case 'CONSENT_FORM':
        htmlContent = renderConsent(templateData);
        break;
    }

    // 4. Return raw HTML if print preview is requested
    if (isPrintPreview) {
      return {
        format: 'html',
        content: htmlContent
      };
    }

    // 5. Generate PDF A4 buffer using Puppeteer
    const pdfBuffer = await this.renderHtmlToPdf(htmlContent);

    // 6. Archival metadata update
    const generatedFileName = `${documentType}-${targetId}-${Date.now()}.pdf`;
    await this.repository.createDocumentGeneration({
      hospitalId,
      documentType,
      targetId,
      generatedFileName,
      generatedBy: userContext.userId
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: `GENERATE_PDF_${documentType}`,
      targetTable: documentType === 'ESTIMATE' ? 'estimates' : 'audit_logs',
      targetId,
      payload: { targetId, documentType, isPrintPreview }
    });

    return {
      format: 'pdf',
      content: pdfBuffer,
      fileName: `${documentType}-${targetId}.pdf`
    };
  }

  async renderHtmlToPdf(htmlContent) {
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.4in',
          bottom: '0.4in',
          left: '0.4in',
          right: '0.4in'
        }
      });
      return pdfBuffer;
    } catch (err) {
      const renderError = new Error(`HTML-to-PDF rendering failed: ${err.message}`);
      renderError.status = 500;
      renderError.code = 'ERR_PDF_RENDER_FAILED';
      throw renderError;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async listDocuments(hospitalId) {
    return this.prisma.documentGeneration.findMany({
      where: { hospitalId },
      orderBy: { generatedAt: 'desc' },
      include: {
        creator: { select: { username: true, firstName: true, lastName: true } }
      }
    });
  }
}

module.exports = DocumentsService;
