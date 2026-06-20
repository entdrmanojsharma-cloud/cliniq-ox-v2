/* 
  Purpose: Define HTML service charges section for Estimate printing.
  Responsibility: Structure OT, Anaesthesia, Room accommodations, medications, and custom charges breakdowns.
*/

function renderChargesSection(data) {
  const items = data.items || [];
  const otMedications = items.filter(i => i.itemGroup === 'OT_MEDICATION' && i.isPrintable);
  const consumables = items.filter(i => i.itemGroup === 'CONSUMABLE' && i.isPrintable);
  const investigations = items.filter(i => i.chargeCategory === 'Investigation' && i.isPrintable);
  const additionalCharges = items.filter(i => i.itemGroup !== 'OT_MEDICATION' && i.itemGroup !== 'CONSUMABLE' && i.itemGroup !== 'ANAESTHESIA' && i.chargeCategory !== 'Investigation' && i.isPrintable);

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

  // OT Medications rows
  const medicationRowsHtml = otMedications.map(m => `
    <tr>
      <td>${m.description}</td>
      <td>${m.quantity} x ${formatCurrency(m.rate)}</td>
      <td>${formatDiscount(m.discountType, m.discountValue, m.discountAmount)}</td>
      <td class="text-right">${formatCurrency(m.amount)}</td>
    </tr>
  `).join('');

  const renderRows = (arr) => arr.map(c => `
    <tr>
      <td>${c.description}</td>
      <td>${c.quantity} x ${formatCurrency(c.rate)}</td>
      <td>${formatDiscount(c.discountType, c.discountValue, c.discountAmount)}</td>
      <td class="text-right">${formatCurrency(c.amount)}</td>
    </tr>
  `).join('');

  const additionalRowsHtml = renderRows(additionalCharges);
  const consumablesRowsHtml = renderRows(consumables);
  const investigationsRowsHtml = renderRows(investigations);

  return `
    <!-- B & C. OT & ANAESTHESIA CHARGES SECTION -->
    <div class="section-title">B & C. Operating Room & Anaesthesia</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Service Description</th>
          <th style="width: 15%;">Calculated</th>
          <th style="width: 20%;">Discount</th>
          <th style="width: 15%;" class="text-right">Final</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Operating Theater Charge</td>
          <td>${formatCurrency(data.actualOtCharge)}</td>
          <td>${formatDiscount(data.otDiscountType, data.otDiscountValue, data.otDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.actualOtCharge - data.otDiscountAmount)}</td>
        </tr>
        <tr>
          <td>Anaesthesia Charge</td>
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
          <th style="width: 40%;">Stay Charge Component</th>
          <th style="width: 10%;">Days</th>
          <th style="width: 15%;">Rate</th>
          <th style="width: 20%;">Discount</th>
          <th style="width: 15%;" class="text-right">Final</th>
        </tr>
      </thead>
      <tbody>
        ${Number(data.roomFinalAmount || 0) > 0 || data.roomOriginalAmount > 0 ? `
        <tr>
          <td>Room Charge (${data.room?.roomName || 'General Ward'})</td>
          <td>${data.expectedStayDays === 0 ? 'Day Care' : data.expectedStayDays}</td>
          <td>${formatCurrency(data.roomDailyRate)}</td>
          <td>${formatDiscount(data.roomDiscountType, data.roomDiscountValue, data.roomDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.roomFinalAmount)}</td>
        </tr>` : ''}
        ${Number(data.nursingFinalAmount || 0) > 0 || data.nursingOriginalAmount > 0 ? `
        <tr>
          <td>Nursing Charge</td>
          <td>${data.expectedStayDays}</td>
          <td>${formatCurrency(data.nursingDailyRate)}</td>
          <td>${formatDiscount(data.nursingDiscountType, data.nursingDiscountValue, data.nursingDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.nursingFinalAmount)}</td>
        </tr>` : ''}
        ${Number(data.icuFinalAmount || 0) > 0 || data.icuOriginalAmount > 0 ? `
        <tr>
          <td>ICU Charge</td>
          <td>${data.icuDays}</td>
          <td>${formatCurrency(data.icuDailyRate)}</td>
          <td>${formatDiscount(data.icuDiscountType, data.icuDiscountValue, data.icuDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.icuFinalAmount)}</td>
        </tr>` : ''}
        ${Number(data.serviceFinalAmount || 0) > 0 || data.serviceOriginalAmount > 0 ? `
        <tr>
          <td>Service Charge</td>
          <td>${data.expectedStayDays}</td>
          <td>${formatCurrency(data.serviceDailyRate)}</td>
          <td>${formatDiscount(data.serviceDiscountType, data.serviceDiscountValue, data.serviceDiscountAmount)}</td>
          <td class="text-right">${formatCurrency(data.serviceFinalAmount)}</td>
        </tr>` : ''}
        ${(Number(data.roomFinalAmount || 0) + Number(data.nursingFinalAmount || 0) + Number(data.icuFinalAmount || 0) + Number(data.serviceFinalAmount || 0)) === 0 ? `
        <tr>
          <td colspan="5" style="color: #666; font-style: italic;">No room stay charges.</td>
        </tr>` : ''}
      </tbody>
    </table>

    <!-- E. OT MEDICATIONS SECTION -->
    <div class="section-title">E. OT Medications</div>
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

    ${consumables.length > 0 ? `
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
    </table>` : ''}
  `;
}

module.exports = renderChargesSection;
