/* 
  Purpose: Define HTML/CSS template for Consent Form printing.
  Responsibility: Structure patient details, clinical procedure description, risk factors, and agreement clauses.
*/

function renderConsentTemplate(data) {
  const hospital = data.hospital || {};
  const patient = data.patient || {};
  const doctor = data.doctor || {};

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
  <title>Informed Surgery Consent - ${patient.name || 'Patient'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
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
      border-bottom: 2px solid #cbd5e1;
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
      margin: 0 0 5px 0;
    }
    .document-title {
      font-size: 16pt;
      font-weight: bold;
      color: #0c4a6e;
      text-align: center;
      margin: 15px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metadata-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
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
    .consent-clause {
      margin-bottom: 20px;
      font-size: 10pt;
      text-align: justify;
    }
    .signature-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 50px;
    }
    .signature-box {
      width: 50%;
      padding: 20px;
      vertical-align: bottom;
    }
    .signature-line {
      border-top: 1px solid #94a3b8;
      width: 80%;
      margin-top: 50px;
      margin-bottom: 5px;
    }
    .signature-label {
      font-size: 8.5pt;
      color: #475569;
      font-weight: bold;
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
        </td>
      </tr>
    </table>

    <div class="document-title">INFORMED CONSENT FOR SURGERY / PROCEDURE</div>

    <table class="metadata-table">
      <tr>
        <td class="metadata-label">Patient Name:</td>
        <td>${patient.name || 'Patient Name'}</td>
        <td class="metadata-label">UHID:</td>
        <td><strong>${patient.uhid || 'UHID'}</strong></td>
      </tr>
      <tr>
        <td class="metadata-label">Gender / DOB:</td>
        <td>${patient.gender || 'MALE'} / ${formatDate(patient.dateOfBirth)}</td>
        <td class="metadata-label">Consulting Doctor:</td>
        <td>Dr. ${doctor.firstName || 'Consulting'} ${doctor.lastName || 'Doctor'}</td>
      </tr>
    </table>

    <div class="consent-clause">
      1. I, the undersigned patient (or legal guardian), hereby authorize Dr. <strong>${doctor.firstName || 'Consulting'} ${doctor.lastName || 'Doctor'}</strong> and associated medical staff to perform the scheduled surgical procedures and necessary anesthetics as estimated.
    </div>

    <div class="consent-clause">
      2. The nature, purpose, risks, and potential complications of the procedure have been explained to me by the consulting clinical staff. I understand that no guarantee or assurance has been given as to the absolute results of the surgery.
    </div>

    <div class="consent-clause">
      3. I consent to the administration of anesthetics as deemed necessary by the anesthesiologist. I understand all anesthetics involve risks of complications, drug reactions, and clinical side effects.
    </div>

    <table class="signature-grid">
      <tr>
        <td class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Patient / Guardian Signature</div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">Date: ____/____/________</div>
        </td>
        <td class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Physician / Witness Signature</div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">Date: ____/____/________</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}

module.exports = renderConsentTemplate;
