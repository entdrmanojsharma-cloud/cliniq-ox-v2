/* 
  Purpose: Define HTML orchestrator component for modular Estimate printing.
  Responsibility: Combine modular subsections (header, patient, surgery, charges, summary, footer) into a single page.
*/

const renderHeader = require('./header');
const renderPatientSection = require('./patient-section');
const renderSurgerySection = require('./surgery-section');
const renderChargesSection = require('./charges-section');
const renderSummarySection = require('./summary-section');
const renderFooter = require('./footer');

function renderEstimateTemplate(data) {
  if (data.isPackage) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Estimate - ${data.estimateNumber || 'N/A'}</title>
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

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .container {
        padding: 0;
        max-width: 100%;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${renderHeader(data)}
    ${renderPatientSection(data)}
    
    <div class="section-title">Package Details</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Package Name</th>
          <th>Package Includes</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: bold;">${data.packageName || 'N/A'}</td>
          <td style="white-space: pre-line;">${data.packageIncludes || 'N/A'}</td>
          <td class="text-right" style="font-weight: bold;">₹${Number(data.packagePrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-container">
      <table class="summary-table">
        <tr class="summary-grand-total">
          <td class="summary-bold">Grand Total</td>
          <td class="text-right summary-bold">₹${Number(data.packagePrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </table>
    </div>

    ${renderFooter(data)}
  </div>
</body>
</html>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Estimate - ${data.estimateNumber || 'N/A'}</title>
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
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${renderHeader(data)}
    ${renderPatientSection(data)}
    ${renderSurgerySection(data)}
    ${renderChargesSection(data)}
    ${renderSummarySection(data)}
    ${renderFooter(data)}
  </div>
</body>
</html>
  `;
}

module.exports = renderEstimateTemplate;
