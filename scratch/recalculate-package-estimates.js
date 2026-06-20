const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all estimates with isPackage: true...');
  const estimates = await prisma.estimate.findMany({
    where: {
      isPackage: true
    },
    include: {
      estimateSurgeries: true,
      estimateItems: true
    }
  });

  console.log(`Found ${estimates.length} package estimate(s) to process.`);

  for (const est of estimates) {
    console.log(`\nProcessing Estimate ${est.estimateNumber} (ID: ${est.id})`);
    console.log(`  Current Subtotal: ${est.subtotal}, Grand Total: ${est.grandTotal}`);
    console.log(`  Package Price: ${est.packagePrice}`);

    const packagePrice = Number(est.packagePrice || 0);
    const taxableSubtotal = packagePrice;
    
    // Non-taxable subtotal is the sum of any non-taxable custom items
    let nonTaxableSubtotal = 0;
    for (const item of est.estimateItems) {
      if (item.isTaxable === false) {
        nonTaxableSubtotal += Number(item.amount || 0);
      }
    }

    const subtotal = taxableSubtotal + nonTaxableSubtotal;

    // Global discount
    const globalDiscVal = Number(est.discountValue || 0);
    let globalDiscAmt = 0;
    if (est.discountType === 'PERCENTAGE') {
      globalDiscAmt = taxableSubtotal * (globalDiscVal / 100);
    } else {
      globalDiscAmt = globalDiscVal;
    }
    if (globalDiscAmt > taxableSubtotal) globalDiscAmt = taxableSubtotal;

    const taxableAmount = taxableSubtotal - globalDiscAmt;

    // GST
    const gstRate = Number(est.gstRate || 18);
    const gstAmount = taxableAmount * (gstRate / 100);
    const grandTotal = taxableAmount + gstAmount + nonTaxableSubtotal;

    console.log(`  Recalculated Subtotal: ${subtotal}, GST Amount: ${gstAmount}, Grand Total: ${grandTotal}`);

    // Update in database
    await prisma.estimate.update({
      where: { id: est.id },
      data: {
        subtotal,
        discount: globalDiscAmt,
        taxableAmount,
        gstAmount,
        grandTotal
      }
    });

    console.log(`  Updated database successfully!`);
  }

  console.log('\nAll package estimates successfully recalculated.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
