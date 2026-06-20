/* 
  Purpose: Define HTML/CSS template for Receipt printing.
  Responsibility: Structure receipt headers, payment modes, amounts paid, and patient profiles.
*/

function renderReceiptTemplate(data) {
  const hospital = data.hospital || {};
  const patient = data.patient || {};

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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${data.receiptNumber || 'REC-TEMP'}</title>
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
    .receipt-block {
      margin: 20px 0;
      padding: 15px;
      border: 1.5px dashed #cbd5e1;
      border-radius: 4px;
      background: #f8fafc;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 10pt;
    }
    .receipt-row strong {
      color: #0f172a;
    }
    .amount-box {
      font-size: 16pt;
      font-weight: bold;
      color: #0c4a6e;
      text-align: center;
      margin: 15px 0 5px 0;
      padding: 10px;
      background: #e0f2fe;
      border-radius: 4px;
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
          <div class="document-title">PAYMENT RECEIPT</div>
          <div class="document-meta" style="font-size: 9pt; color: #444; margin-top: 5px;">
            <strong>Receipt No:</strong> ${data.receiptNumber || 'REC-TEMP'}<br />
            <strong>Date:</strong> ${formatDate(data.createdAt || new Date())}<br />
            <strong>Invoice Ref:</strong> ${data.invoiceNumber || 'N/A'}
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

    <div class="receipt-block">
      <div class="receipt-row">
        <span>Payment Mode:</span>
        <strong>${data.paymentMode || 'CASH / CARD / ONLINE'}</strong>
      </div>
      <div class="receipt-row">
        <span>Transaction ID / Ref:</span>
        <strong>${data.transactionRef || 'N/A'}</strong>
      </div>
      <div class="receipt-row">
        <span>Being Paid For:</span>
        <strong>${data.remarks || 'Medical Consultation & Operating Theater Charges'}</strong>
      </div>
      <div class="amount-box">
        Amount Received: ${formatCurrency(data.amountPaid || 0)}
      </div>
    </div>

    <table class="footer-grid">
      <tr>
        <td style="font-size: 8.5pt; color: #64748b; vertical-align: top;">
          This is an automated system-generated payment receipt and does not require a physical signature.
        </td>
        <td style="text-align: right; vertical-align: bottom;">
          <div class="signature-line"></div>
          <div style="font-size: 8.5pt; color: #475569; font-weight: bold; margin-top: 5px;">Cashier / Receiver Signature</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}

module.exports = renderReceiptTemplate;
