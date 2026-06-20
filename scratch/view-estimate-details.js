const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying estimate with number EST-2026-0011...');
  const est = await prisma.estimate.findFirst({
    where: {
      estimateNumber: 'EST-2026-0011'
    },
    include: {
      estimateSurgeries: true,
      estimateItems: true
    }
  });

  if (!est) {
    console.error('Estimate not found!');
    return;
  }

  console.log('--- Estimate Main Fields ---');
  console.log({
    id: est.id,
    estimateNumber: est.estimateNumber,
    status: est.status,
    grandTotal: est.grandTotal,
    subtotal: est.subtotal,
    discount: est.discount,
    discountType: est.discountType,
    discountValue: est.discountValue,
    taxableAmount: est.taxableAmount,
    gstRate: est.gstRate,
    gstAmount: est.gstAmount,
    isPackage: est.isPackage,
    packageName: est.packageName,
    packagePrice: est.packagePrice,
    packageIncludes: est.packageIncludes,
    actualOtCharge: est.actualOtCharge,
    actualAnaesthesiaCharge: est.actualAnaesthesiaCharge,
    roomDailyRate: est.roomDailyRate,
    roomFinalAmount: est.roomFinalAmount,
    nursingFinalAmount: est.nursingFinalAmount,
    icuFinalAmount: est.icuFinalAmount,
    serviceFinalAmount: est.serviceFinalAmount
  });

  console.log('\n--- Estimate Surgeries ---');
  console.log(est.estimateSurgeries.map(s => ({
    id: s.id,
    surgeryId: s.surgeryId,
    surgeryCost: s.surgeryCost,
    discountAmount: s.discountAmount,
    finalAmount: s.finalAmount
  })));

  console.log('\n--- Estimate Items ---');
  console.log(est.estimateItems.map(i => ({
    id: i.id,
    itemName: i.itemName,
    itemGroup: i.itemGroup,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    discountAmount: i.discountAmount,
    finalAmount: i.finalAmount
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
