/* 
  Purpose: Define HTML/CSS template for Invoice printing.
  Responsibility: Structure patient, doctor, billing line items, GST breakdown, and transaction status in an A4 printable format.
*/

function renderInvoiceTemplate(data) {
  const hospital = data.hospital || {};
  const patient = data.patient || {};
  const items = data.items || [];

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return 'INR ' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const itemRowsHtml = items.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${item.description}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.rate)}</td>
      <td class="text-right">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${data.invoiceNumber || 'INV-TEMP'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      box-sizing: border-box;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .hospital-name {
      font-size: 18pt;
      font-weight: bold;
      color: #0f172a;
      margin: 0 0 5px 0;
    }
    .hospital-meta {
      font-size: 8.5pt;
      color: #555;
      margin: 0;
    }
    .document-title-box {
      text-align: right;
      vertical-align: top;
    }
    .document-title {
      font-size: 20pt;
      font-weight: bold;
      color: #0f172a;
      margin: 0;
    }
    .metadata-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .metadata-table td {
      padding: 8px 12px;
      font-size: 9.5pt;
    }
    .metadata-label {
      font-weight: bold;
      color: #475569;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .items-table th {
      background: #f1f5f9;
      font-weight: bold;
      text-align: left;
      padding: 8px 10px;
      font-size: 9pt;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .items-table td {
      padding: 8px 10px;
      font-size: 9.5pt;
      border-bottom: 1px solid #e2e8f0;
    }
    .text-right {
      text-align: right !important;
    }
    .summary-table {
      width: 300px;
      margin-left: auto;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .summary-table td {
      padding: 5px 8px;
      font-size: 9.5pt;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-grand-total {
      font-size: 12pt;
      font-weight: bold;
      color: #0f172a;
      background: #f1f5f9;
      border-top: 1.5px solid #cbd5e1;
      border-bottom: 1.5px solid #cbd5e1 !important;
    }
    .footer-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 35px;
    }
    .signature-line {
      border-top: 1px solid #94a3b8;
      width: 180px;
      margin-left: auto;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="container">
    <table class="header-table">
      <tr>
        <td>
          <h1 class="hospital-name">${hospital.name || 'Hospital Name'}</h1>
          <p class="hospital-meta">${hospital.address || 'Address'}</p>
          <p class="hospital-meta">Phone: ${hospital.phone || 'Phone'} | Email: ${hospital.email || 'Email'}</p>
          ${hospital.gstNumber ? `<p class="hospital-meta"><strong>GSTIN:</strong> ${hospital.gstNumber}</p>` : ''}
        </td>
        <td class="document-title-box">
          <div class="document-title">TAX INVOICE</div>
          <div class="document-meta" style="font-size: 9pt; color: #444; margin-top: 5px;">
            <strong>Invoice No:</strong> ${data.invoiceNumber || 'INV-TEMP'}<br />
            <strong>Date:</strong> ${formatDate(data.createdAt || new Date())}<br />
            <strong>Status:</strong> ${data.status || 'UNPAID'}
          </div>
        </td>
      </tr>
    </table>

    <table class="metadata-table">
      <tr>
        <td class="metadata-label">Patient Name:</td>
        <td>${patient.name || 'Patient Name'}</td>
        <td class="metadata-label">UHID / Patient ID:</td>
        <td><strong>${patient.uhid || 'UHID'}</strong></td>
      </tr>
      <tr>
        <td class="metadata-label">Gender / DOB:</td>
        <td>${patient.gender || 'MALE'} / ${formatDate(patient.dateOfBirth)}</td>
        <td class="metadata-label">Contact Mobile:</td>
        <td>${patient.mobile || 'N/A'}</td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 8%;">S.No</th>
          <th style="width: 50%;">Description of Service / Medication</th>
          <th style="width: 12%;">Qty</th>
          <th style="width: 15%;">Rate</th>
          <th style="width: 15%;" class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml || '<tr><td colspan="5" style="color: #666; font-style: italic; text-align: center;">No items listed.</td></tr>'}
      </tbody>
    </table>

    <table class="summary-table">
      <tr>
        <td>Subtotal Amount:</td>
        <td class="text-right">${formatCurrency(data.subtotal || 0)}</td>
      </tr>
      <tr>
        <td>GST Amount:</td>
        <td class="text-right">${formatCurrency(data.gstAmount || 0)}</td>
      </tr>
      <tr class="summary-grand-total">
        <td>Grand Total:</td>
        <td class="text-right">${formatCurrency(data.grandTotal || 0)}</td>
      </tr>
    </table>

    <table class="footer-grid">
      <tr>
        <td style="font-size: 8.5pt; color: #64748b; vertical-align: top;">
          Thank you for choosing our hospital services. All disputes subject to local jurisdiction.
        </td>
        <td style="text-align: right; vertical-align: bottom;">
          <div class="signature-line"></div>
          <div style="font-size: 8.5pt; color: #475569; font-weight: bold; margin-top: 5px;">Receiver Signature / Authorized Sign</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}

module.exports = renderInvoiceTemplate;
