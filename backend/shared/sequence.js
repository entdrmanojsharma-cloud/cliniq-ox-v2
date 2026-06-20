/* 
  Purpose: Define shared sequence number generation logic.
  Responsibility: Generate sequential, prefix-based, chronological numbers atomically (using DB atomic upsert increments).
*/

async function generateSequenceNumber(prisma, hospitalId, documentType) {
  const year = new Date().getFullYear();

  // 1. Resolve default prefix based on hospital profile configurations
  let prefix = '';
  switch (documentType) {
    case 'ESTIMATE':
      prefix = 'EST';
      break;
    case 'INVOICE':
      prefix = 'INV';
      break;
    case 'RECEIPT':
      prefix = 'REC';
      break;
    case 'REFUND':
      prefix = 'REF';
      break;
    case 'CREDIT_NOTE':
      prefix = 'CN';
      break;
    default:
      prefix = 'DOC';
  }

  // Load prefix overrides from hospital profile if available
  const profile = await prisma.hospitalProfile.findUnique({
    where: { id: hospitalId }
  });

  if (profile) {
    if (documentType === 'ESTIMATE' && profile.estimatePrefix) prefix = profile.estimatePrefix;
    if (documentType === 'INVOICE' && profile.invoicePrefix) prefix = profile.invoicePrefix;
    if (documentType === 'RECEIPT' && profile.receiptPrefix) prefix = profile.receiptPrefix;
  }

  const modelMapping = {
    'ESTIMATE': { model: 'estimate', field: 'estimateNumber' },
    'INVOICE': { model: 'invoice', field: 'invoiceNumber' },
    'RECEIPT': { model: 'receipt', field: 'receiptNumber' },
    'REFUND': { model: 'refund', field: 'refundNumber' },
    'CREDIT_NOTE': { model: 'creditNote', field: 'creditNoteNumber' }
  };

  const mapping = modelMapping[documentType];
  let isUnique = false;
  let finalNumber = '';

  while (!isUnique) {
    // Atomically upsert and increment DocumentSequence inside DB transaction
    const seq = await prisma.documentSequence.upsert({
      where: {
        hospitalId_documentType_year: {
          hospitalId,
          documentType,
          year
        }
      },
      update: {
        nextValue: { increment: 1 }
      },
      create: {
        hospitalId,
        documentType,
        year,
        nextValue: 2 // Value 1 is taken by this first operation
      }
    });

    const value = seq.nextValue - 1; // Retrieve current counter value
    const sequenceStr = String(value).padStart(4, '0');
    finalNumber = `${prefix}-${year}-${sequenceStr}`;

    if (mapping) {
      const existing = await prisma[mapping.model].findFirst({
        where: {
          [mapping.field]: finalNumber
        }
      });
      if (!existing) {
        isUnique = true;
      } else {
        console.log(`[Sequence Generator] Collision detected for ${documentType}: ${finalNumber}. Retrying next sequence counter value...`);
      }
    } else {
      isUnique = true;
    }
  }

  return finalNumber;
}

module.exports = generateSequenceNumber;
