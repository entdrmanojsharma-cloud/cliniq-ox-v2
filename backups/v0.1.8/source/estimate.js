/* 
  Purpose: Define HTML/CSS template for Estimate printing.
  Responsibility: Structure patient details, surgeries, stay, items, and total blocks in an A4 printable format.
*/

function renderEstimateTemplate(data) {
  const hospital = data.hospital || {};
  const patient = data.patient || {};
  const doctor = data.doctor || {};
  const surgeries = data.surgeries || [];
  const items = data.items || [];

  // Group items by category/group
  const otMedications = items.filter(i => i.itemGroup === 'OT_MEDICATION' && i.isPrintable);
  const additionalCharges = items.filter(i => i.itemGroup !== 'OT_MEDICATION' && i.isPrintable);

  // Formatting helpers
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return 'INR ' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const formatDiscount = (type, val, amt) => {
    if (Number(amt || 0) === 0) return '0.00';
    if (type === 'PERCENTAGE') {
      return `${Number(val).toFixed(0)}% (${formatCurrency(amt)})`;
    }
    return formatCurrency(amt);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Surgeries section rows
  const surgeryRowsHtml = surgeries.map(s => `
    <tr>
      <td>${s.surgery.surgeryName} (${s.surgery.surgeryCode})</td>
      <td>${formatCurrency(s.surgeryCost)}</td>
      <td>${formatDiscount(s.discountType, s.discountValue, s.discountAmount)}</td>
      <td class="text-right">${formatCurrency(s.finalAmount)}</td>
    </tr>
  `).join('');

  // OT Medications rows
  const medicationRowsHtml = otMedications.map(m => `
    <tr>
      <td>${m.description}</td>
      <td>${m.quantity} x ${formatCurrency(m.rate)}</td>
      <td>${formatDiscount(m.discountType, m.discountValue, m.discountAmount)}</td>
      <td class="text-right">${formatCurrency(m.amount)}</td>
    </tr>
  `).join('');

  // Additional charges rows
  const additionalRowsHtml = additionalCharges.map(c => `
    <tr>
      <td>${c.description} [${c.chargeCategory}]</td>
      <td>${c.quantity} x ${formatCurrency(c.rate)}</td>
      <td>${formatDiscount(c.discountType, c.discountValue, c.discountAmount)}</td>
      <td class="text-right">${formatCurrency(c.amount)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Estimate - ${data.estimateNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
    
    /* Branding Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .header-logo {
      width: 70px;
      height: 70px;
      vertical-align: top;
    }
    .header-branding {
      padding-left: 15px;
      vertical-align: top;
    }
    .hospital-name {
      font-size: 18pt;
      font-weight: bold;
      color: #0c4a6e;
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
      color: #0c4a6e;
      margin: 0 0 5px 0;
      letter-spacing: 1px;
    }
    .document-meta {
      font-size: 9pt;
      color: #444;
    }

    /* Metadata grids */
    .metadata-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .metadata-table td {
      padding: 8px 12px;
      font-size: 9.5pt;
      width: 25%;
    }
    .metadata-label {
      font-weight: bold;
      color: #475569;
    }

    /* Layout Sections */
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      color: #0c4a6e;
      border-bottom: 1.5px solid #0c4a6e;
      padding-bottom: 3px;
      margin: 20px 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      page-break-after: avoid;
    }
    
    /* Grids & Tables */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .items-table th {
      background: #f1f5f9;
      font-weight: bold;
      color: #334155;
      text-align: left;
      padding: 6px 10px;
      font-size: 9pt;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .items-table td {
      padding: 8px 10px;
      font-size: 9.5pt;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .text-right {
      text-align: right !important;
    }
    .nowrap {
      white-space: nowrap;
    }

    /* Summary Block */
    .summary-container {
      width: 100%;
      margin-top: 15px;
      page-break-inside: avoid;
    }
    .summary-table {
      width: 320px;
      margin-left: auto;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 5px 8px;
      font-size: 9.5pt;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-bold {
      font-weight: bold;
      color: #0f172a;
    }
    .summary-grand-total {
      font-size: 12pt;
      font-weight: bold;
      color: #0c4a6e;
      background: #f0f9ff;
      border-top: 1.5px solid #0c4a6e;
      border-bottom: 1.5px solid #0c4a6e !important;
    }

    /* Signature & Terms */
    .footer-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 35px;
      page-break-inside: avoid;
    }
    .terms-box {
      width: 60%;
      vertical-align: top;
      padding-right: 20px;
      font-size: 8pt;
      color: #64748b;
    }
    .terms-title {
      font-weight: bold;
      color: #475569;
      margin-bottom: 5px;
    }
    .signature-box {
      width: 40%;
      vertical-align: bottom;
      text-align: right;
      padding-bottom: 10px;
    }
    .signature-line {
      border-top: 1px solid #94a3b8;
      width: 180px;
      margin-left: auto;
      margin-top: 50px;
      margin-bottom: 5px;
    }
    .signature-label {
      font-size: 8.5pt;
      color: #475569;
      font-weight: bold;
    }

    /* Print settings */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .container {
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- BRANDING HEADER -->
    <table class="header-table">
      <tr>
        ${hospital.logoUrl ? `<td class="header-logo"><img src="${hospital.logoUrl}" alt="Logo" class="header-logo" /></td>` : ''}
        <td class="header-branding">
          <h1 class="hospital-name">${hospital.name}</h1>
          <p class="hospital-meta">${hospital.address}</p>
          <p class="hospital-meta">Phone: ${hospital.phone} | Email: ${hospital.email}</p>
          ${hospital.gstNumber ? `<p class="hospital-meta"><strong>GSTIN:</strong> ${hospital.gstNumber}</p>` : ''}
        </td>
        <td class="document-title-box">
          <div class="document-title">ESTIMATE</div>
          <div class="document-meta">
            <strong>No:</strong> ${data.estimateNumber}<br />
            <strong>Date:</strong> ${formatDate(data.createdAt)}<br />
            <strong>Status:</strong> ${data.status}
          </div>
        </td>
      </tr>
    </table>

    <!-- PATIENT & DOCTOR METADATA -->
    <table class="metadata-table">
      <tr>
        <td class="metadata-label">Patient Name:</td>
        <td>${patient.name}</td>
        <td class="metadata-label">UHID / Patient ID:</td>
        <td><strong>${patient.uhid}</strong></td>
      </tr>
      <tr>
        <td class="metadata-label">Gender / DOB:</td>
        <td>${patient.gender} / ${formatDate(patient.dateOfBirth)}</td>
        <td class="metadata-label">Contact Mobile:</td>
        <td>${patient.mobile}</td>
      </tr>
      <tr>
        <td class="metadata-label">Doctor / Surgeon:</td>
        <td>Dr. ${doctor.firstName} ${doctor.lastName}</td>
        <td class="metadata-label">Specialty:</td>
        <td>${doctor.specialty}</td>
      </tr>
    </table>

    <!-- A. SURGERY DETAILS SECTION -->
    <div class="section-title">A. Surgery Procedures</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Surgery Name</th>
          <th style="width: 15%;">Cost</th>
          <th style="width: 20%;">Discount</th>
          <th style="width: 15%;" class="text-right">Final Amount</th>
        </tr>
      </thead>
      <tbody>
        ${surgeryRowsHtml || '<tr><td colspan="4" style="color: #666; font-style: italic;">No surgery entries.</td></tr>'}
      </tbody>
    </table>

    <!-- B & C. OT & ANAESTHESIA CHARGES SECTION -->
    <div class="section-title">B & C. Operating Room & Anaesthesia</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Service Description</th>
          <th style="width: 15%;">Original Amount</th>
          <th style="width: 20%;">Discount</th>
          <th style="width: 15%;" class="text-right">Final Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Operating Theater Charge (Est. ${data.expectedDurationMinutes} min)</td>
          <td>${formatCurrency(data.actualOtCharge)}</td>
          <td>${formatDiscount(data.otDiscountType, data.otDiscountValue, data.otDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.actualOtCharge - data.otDiscountAmount)}</td>
        </tr>
        <tr>
          <td>Anaesthesia Service Charge</td>
          <td>${formatCurrency(data.actualAnaesthesiaCharge)}</td>
          <td>${formatDiscount(data.anaesthesiaDiscountType, data.anaesthesiaDiscountValue, data.anaesthesiaDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.actualAnaesthesiaCharge - data.anaesthesiaDiscountAmount)}</td>
        </tr>
      </tbody>
    </table>

    <!-- D. STAY DETAILS SECTION -->
    <div class="section-title">D. Room Stay & Accommodations</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Stay Charge Component</th>
          <th style="width: 15%;">Rate / Period</th>
          <th style="width: 20%;">Discount</th>
          <th style="width: 15%;" class="text-right">Final Amount</th>
        </tr>
      </thead>
      <tbody>
        ${Number(data.roomFinalAmount || 0) > 0 || data.roomOriginalAmount > 0 ? `
        <tr>
          <td>Room Charge (${data.room?.roomName || 'General Ward'} - ${data.expectedStayDays} Days)</td>
          <td>${formatCurrency(data.roomDailyRate)} / Day</td>
          <td>${formatDiscount(data.roomDiscountType, data.roomDiscountValue, data.roomDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.roomFinalAmount)}</td>
        </tr>` : ''}
        ${Number(data.nursingFinalAmount || 0) > 0 || data.nursingOriginalAmount > 0 ? `
        <tr>
          <td>Nursing Charges (${data.expectedStayDays} Days)</td>
          <td>${formatCurrency(data.nursingDailyRate)} / Day</td>
          <td>${formatDiscount(data.nursingDiscountType, data.nursingDiscountValue, data.nursingDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.nursingFinalAmount)}</td>
        </tr>` : ''}
        ${Number(data.icuFinalAmount || 0) > 0 || data.icuOriginalAmount > 0 ? `
        <tr>
          <td>ICU Service Charges (${data.icuDays} Days)</td>
          <td>${formatCurrency(data.icuDailyRate)} / Day</td>
          <td>${formatDiscount(data.icuDiscountType, data.icuDiscountValue, data.icuDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.icuFinalAmount)}</td>
        </tr>` : ''}
        ${Number(data.serviceFinalAmount || 0) > 0 || data.serviceOriginalAmount > 0 ? `
        <tr>
          <td>Additional Care Services (${data.expectedStayDays} Days)</td>
          <td>${formatCurrency(data.serviceDailyRate)} / Day</td>
          <td>${formatDiscount(data.serviceDiscountType, data.serviceDiscountValue, data.serviceDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.serviceFinalAmount)}</td>
        </tr>` : ''}
        ${(Number(data.roomFinalAmount || 0) + Number(data.nursingFinalAmount || 0) + Number(data.icuFinalAmount || 0) + Number(data.serviceFinalAmount || 0)) === 0 ? `
        <tr>
          <td colspan="4" style="color: #666; font-style: italic;">No room stay charges.</td>
        </tr>` : ''}
      </tbody>
    </table>

    <!-- E. OT MEDICATIONS SECTION -->
    <div class="section-title">E. OT Medications & Consumables</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Item Description</th>
          <th style="width: 15%;">Unit Rate</th>
          <th style="width: 20%;">Discount</th>
          <th style="width: 15%;" class="text-right">Final Amount</th>
        </tr>
      </thead>
      <tbody>
        ${medicationRowsHtml || '<tr><td colspan="4" style="color: #666; font-style: italic;">No OT medications charged.</td></tr>'}
      </tbody>
    </table>

    <!-- F. ADDITIONAL CHARGES SECTION -->
    <div class="section-title">F. Additional Custom Charges</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Charge Description</th>
          <th style="width: 15%;">Unit Rate</th>
          <th style="width: 20%;">Discount</th>
          <th style="width: 15%;" class="text-right">Final Amount</th>
        </tr>
      </thead>
      <tbody>
        ${additionalRowsHtml || '<tr><td colspan="4" style="color: #666; font-style: italic;">No additional charges.</td></tr>'}
      </tbody>
    </table>

    <!-- G. SUMMARY BILLING SECTION -->
    <div class="summary-container">
      <table class="summary-table">
        <tr>
          <td class="summary-bold">Subtotal Amount:</td>
          <td class="text-right">${formatCurrency(data.subtotal)}</td>
        </tr>
        <tr>
          <td class="summary-bold">Global Discount (${formatDiscount(data.discountType, data.discountValue, data.discountAmount)}):</td>
          <td class="text-right text-red">- ${formatCurrency(data.discountAmount)}</td>
        </tr>
        <tr>
          <td class="summary-bold">Taxable Amount:</td>
          <td class="text-right">${formatCurrency(data.taxableAmount)}</td>
        </tr>
        <tr>
          <td class="summary-bold">Estimated GST (${data.gstRate}%):</td>
          <td class="text-right">+ ${formatCurrency(data.gstAmount)}</td>
        </tr>
        <tr class="summary-grand-total">
          <td>Grand Total:</td>
          <td class="text-right nowrap">${formatCurrency(data.grandTotal)}</td>
        </tr>
      </table>
    </div>

    <!-- SIGNATURES & TERMS -->
    <table class="footer-grid">
      <tr>
        <td class="terms-box">
          <div class="terms-title">Terms & Conditions:</div>
          1. This is a baseline clinical estimate and is valid for 30 days from date of issue.<br />
          2. Actual billing charges might vary based on surgeon assessment, clinical complications, stay duration, or custom medical implants.<br />
          3. Medications, implants, and diagnostics are billed on actual usage.
        </td>
        <td class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Authorized Signature / Stamp</div>
        </td>
      </tr>
    </table>

  </div>
</body>
</html>
  `;
}

module.exports = renderEstimateTemplate;
