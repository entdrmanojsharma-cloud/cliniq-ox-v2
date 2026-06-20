/* 
  Purpose: Define HTML summary totals section for Estimate printing.
  Responsibility: Structure Subtotal, Global Discounts, Taxable Base, GST, and Grand Totals.
*/

function renderSummarySection(data) {
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

  return `
    <div class="summary-container">
      <table class="summary-table">
        <tr>
          <td class="summary-bold">Subtotal Amount:</td>
          <td class="text-right">${formatCurrency(data.subtotal)}</td>
        </tr>
        <tr>
          <td class="summary-bold">Global Discount (${formatDiscount(data.discountType, data.discountValue, data.discountAmount)}):</td>
          <td class="text-right text-red" style="color: #dc2626;">- ${formatCurrency(data.discountAmount)}</td>
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
  `;
}

module.exports = renderSummarySection;
