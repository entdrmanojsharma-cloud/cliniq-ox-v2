/* 
  Purpose: Define HTML surgery procedures section for Estimate printing.
  Responsibility: Structure surgeries, base costs, surgical discounts, and net amounts.
*/

function renderSurgerySection(data) {
  const surgeries = data.surgeries || [];

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

  const surgeryRowsHtml = surgeries.map(s => `
    <tr>
      <td>${s.surgery?.surgeryName || 'Surgery Procedure'} (${s.surgery?.surgeryCode || 'N/A'})</td>
      <td>${formatCurrency(s.surgeryCost)}</td>
      <td>${formatDiscount(s.discountType, s.discountValue, s.discountAmount)}</td>
      <td class="text-right">${formatCurrency(s.finalAmount)}</td>
    </tr>
  `).join('');

  return `
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
  `;
}

module.exports = renderSurgerySection;
