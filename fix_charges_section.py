with open("/Users/Shared/Mobile app cliniq-OX/backend/modules/documents/templates/estimate/charges-section.js", "r") as f:
    content = f.read()

import re

# Replace the data categorization
old_categorization = """  const otMedications = items.filter(i => i.itemGroup === 'OT_MEDICATION' && i.isPrintable);
  const additionalCharges = items.filter(i => i.itemGroup !== 'OT_MEDICATION' && i.isPrintable);"""

new_categorization = """  const otMedications = items.filter(i => i.itemGroup === 'OT_MEDICATION' && i.isPrintable);
  const consumables = items.filter(i => i.itemGroup === 'CONSUMABLE' && i.isPrintable);
  const investigations = items.filter(i => i.chargeCategory === 'Investigation' && i.isPrintable);
  const additionalCharges = items.filter(i => i.itemGroup !== 'OT_MEDICATION' && i.itemGroup !== 'CONSUMABLE' && i.itemGroup !== 'ANAESTHESIA' && i.chargeCategory !== 'Investigation' && i.isPrintable);"""

content = content.replace(old_categorization, new_categorization)

# Define rowsHtml function inline
old_rows_html = """  // Additional charges rows
  const additionalRowsHtml = additionalCharges.map(c => `
    <tr>
      <td>${c.description}</td>
      <td>${c.quantity} x ${formatCurrency(c.rate)}</td>
      <td>${formatDiscount(c.discountType, c.discountValue, c.discountAmount)}</td>
      <td class="text-right">${formatCurrency(c.amount)}</td>
    </tr>
  `).join('');"""

new_rows_html = """  const renderRows = (arr) => arr.map(c => `
    <tr>
      <td>${c.description}</td>
      <td>${c.quantity} x ${formatCurrency(c.rate)}</td>
      <td>${formatDiscount(c.discountType, c.discountValue, c.discountAmount)}</td>
      <td class="text-right">${formatCurrency(c.amount)}</td>
    </tr>
  `).join('');

  const additionalRowsHtml = renderRows(additionalCharges);
  const consumablesRowsHtml = renderRows(consumables);
  const investigationsRowsHtml = renderRows(investigations);"""

content = content.replace(old_rows_html, new_rows_html)

# Add the sections to the output string
old_output = """    <!-- F. ADDITIONAL CHARGES SECTION -->
    <div class="section-title">F. Additional Charges</div>
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
    </table>"""

new_output = """    ${consumables.length > 0 ? `
    <!-- CONSUMABLES & IMPLANTS SECTION -->
    <div class="section-title">Consumables & Implants</div>
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
        ${consumablesRowsHtml}
      </tbody>
    </table>` : ''}

    ${investigations.length > 0 ? `
    <!-- INVESTIGATIONS SECTION -->
    <div class="section-title">Investigations</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Test Description</th>
          <th style="width: 15%;">Unit Rate</th>
          <th style="width: 20%;">Discount</th>
          <th style="width: 15%;" class="text-right">Final Amount</th>
        </tr>
      </thead>
      <tbody>
        ${investigationsRowsHtml}
      </tbody>
    </table>` : ''}

    ${additionalCharges.length > 0 ? `
    <!-- ADDITIONAL CHARGES SECTION -->
    <div class="section-title">Additional Charges</div>
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
        ${additionalRowsHtml}
      </tbody>
    </table>` : ''}"""

content = content.replace(old_output, new_output)

with open("/Users/Shared/Mobile app cliniq-OX/backend/modules/documents/templates/estimate/charges-section.js", "w") as f:
    f.write(content)
