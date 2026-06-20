/* 
  Purpose: Define HTML footer component for Estimate printing.
  Responsibility: Structure signatures fields and clinical/hospital terms and conditions.
*/

function renderFooter(data = {}) {
  const customNotes = data.notes && data.notes.trim().length > 0 
    ? data.notes.replace(/\n/g, '<br />')
    : `1. This is a baseline clinical estimate and is valid for 30 days from date of issue.<br />
       2. Actual billing charges might vary based on surgeon assessment, clinical complications, stay duration, or custom medical implants.<br />
       3. Medications, implants, and diagnostics are billed on actual usage.`;

  return `
    <table class="footer-grid">
      <tr>
        <td class="terms-box">
          <div class="terms-title">Terms & Conditions:</div>
          <div style="font-size: 10pt; color: #555;">
            ${customNotes}
          </div>
        </td>
        <td class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Authorized Signature / Stamp</div>
        </td>
      </tr>
    </table>
  `;
}

module.exports = renderFooter;
