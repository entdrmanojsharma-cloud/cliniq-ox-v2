/* 
  Purpose: Unit tests for testing Documents rendering and generation logic.
  Responsibility: Assert correct HTML template mapping, PDF buffer generation, and archival updating.
*/

const assert = require('assert');
const DocumentsService = require('../../backend/modules/documents/service');

// Mock data graphs
const mockEstimateGraph = {
  id: 'est-123',
  estimateNumber: 'EST-2026-0001',
  hospitalId: 'hosp-123',
  eventId: 'evt-123',
  roomId: 'room-123',
  status: 'APPROVED',
  billingStatus: 'UNBILLED',
  expectedDurationMinutes: 120,
  expectedStayDays: 3,
  icuDays: 1,
  icuDailyRate: 5000.00,
  calculatedOtCharge: 4000.00,
  actualOtCharge: 4000.00,
  otDiscountType: 'PERCENTAGE',
  otDiscountValue: 0.00,
  otDiscountAmount: 0.00,
  calculatedAnaesthesiaCharge: 3000.00,
  actualAnaesthesiaCharge: 3000.00,
  anaesthesiaDiscountPct: 0.00,
  anaesthesiaDiscountType: 'PERCENTAGE',
  anaesthesiaDiscountValue: 0.00,
  anaesthesiaDiscountAmount: 0.00,
  roomDailyRate: 3000.00,
  roomOriginalAmount: 9000.00,
  roomDiscountType: 'PERCENTAGE',
  roomDiscountValue: 0.00,
  roomDiscountAmount: 0.00,
  roomFinalAmount: 9000.00,
  nursingDailyRate: 500.00,
  nursingOriginalAmount: 1500.00,
  nursingDiscountType: 'PERCENTAGE',
  nursingDiscountValue: 0.00,
  nursingDiscountAmount: 0.00,
  nursingFinalAmount: 1500.00,
  icuOriginalAmount: 5000.00,
  icuDiscountType: 'PERCENTAGE',
  icuDiscountValue: 0.00,
  icuDiscountAmount: 0.00,
  icuFinalAmount: 5000.00,
  serviceDailyRate: 100.00,
  serviceOriginalAmount: 300.00,
  serviceDiscountType: 'PERCENTAGE',
  serviceDiscountValue: 0.00,
  serviceDiscountAmount: 0.00,
  serviceFinalAmount: 300.00,
  subtotal: 44400.00,
  discount: 1000.00,
  discountType: 'FIXED_AMOUNT',
  discountValue: 1000.00,
  discountAmount: 1000.00,
  taxableAmount: 35800.00,
  gstRate: 18.00,
  gstAmount: 6444.00,
  grandTotal: 49844.00,
  createdAt: new Date(),
  event: {
    patient: {
      uhid: 'UHID-999',
      name: 'John Doe',
      gender: 'MALE',
      dateOfBirth: new Date('1990-01-01'),
      mobile: '9876543210'
    },
    doctor: {
      firstName: 'Jane',
      lastName: 'Smith',
      specialty: 'Cardiology'
    }
  },
  estimateSurgeries: [
    {
      surgeryCost: 10000.00,
      discountType: 'PERCENTAGE',
      discountValue: 10.00,
      discountAmount: 1000.00,
      finalAmount: 9000.00,
      surgery: {
        surgeryCode: 'SURG-01',
        surgeryName: 'CABG'
      }
    }
  ],
  estimateItems: [
    {
      chargeCategory: 'OT_MEDICATION',
      description: 'Propofol',
      quantity: 2,
      rate: 600.00,
      originalAmount: 1200.00,
      discountType: 'FIXED_AMOUNT',
      discountValue: 200.00,
      discountAmount: 200.00,
      amount: 1000.00,
      itemGroup: 'OT_MEDICATION',
      isPrintable: true,
      isTaxable: true
    }
  ]
};

// Mock prisma client
const mockPrisma = {
  hospitalProfile: {
    findUnique: async () => ({
      id: 'hosp-123',
      name: 'Cliniq-OX Super Specialty Hospital',
      address: '123 Health Ave, New Delhi, India',
      phone: '+91-11-22334455',
      email: 'contact@cliniqox.com',
      logoUrl: 'https://cliniqox.com/logo.png',
      gstNumber: '07AAAAA1111A1Z1',
      estimatePrefix: 'EST'
    })
  },
  auditLog: {
    create: async () => ({ id: 'audit-123' })
  }
};

let updatedArchivalData = null;

const mockRepository = {
  getEstimateGraph: async (id, hospitalId) => {
    if (id === 'est-123' && hospitalId === 'hosp-123') {
      return mockEstimateGraph;
    }
    return null;
  },
  updateEstimateArchival: async (id, data) => {
    updatedArchivalData = { id, data };
    return { ...mockEstimateGraph, ...data };
  }
};

const service = new DocumentsService(mockRepository, mockPrisma);

async function runTests() {
  console.log('--- Starting Documents Rendering & PDF Generation Tests ---');

  const userContext = {
    userId: 'user-789',
    email: 'admin@cliniqox.com',
    role: 'ADMIN'
  };

  // Test Case 1: Print Preview HTML for ESTIMATE
  try {
    const res1 = await service.generateDocument('hosp-123', {
      documentType: 'ESTIMATE',
      targetId: 'est-123',
      isPrintPreview: true
    }, userContext);

    assert.strictEqual(res1.format, 'html');
    assert.ok(res1.content.includes('Cliniq-OX Super Specialty Hospital'));
    assert.ok(res1.content.includes('EST-2026-0001'));
    assert.ok(res1.content.includes('CABG')); // Surgery Name
    assert.ok(res1.content.includes('Propofol')); // OT Medication item
    assert.ok(res1.content.includes('INR 49,844.00')); // Grand total check

    console.log('✅ Test Case 1 Passed: Print Preview HTML matches layout details.');
  } catch (err) {
    console.error('❌ Test Case 1 Failed:', err);
    process.exit(1);
  }

  // Test Case 2: PDF Buffer Generation for ESTIMATE & Archival Update
  try {
    updatedArchivalData = null;
    const res2 = await service.generateDocument('hosp-123', {
      documentType: 'ESTIMATE',
      targetId: 'est-123',
      isPrintPreview: false
    }, userContext);

    assert.strictEqual(res2.format, 'pdf');
    assert.ok(Buffer.isBuffer(res2.content));
    assert.ok(res2.fileName.includes('ESTIMATE-est-123.pdf'));

    // Check archival update occurred
    assert.ok(updatedArchivalData);
    assert.strictEqual(updatedArchivalData.id, 'est-123');
    assert.ok(updatedArchivalData.data.generatedFileName.startsWith('ESTIMATE-est-123-'));
    assert.strictEqual(updatedArchivalData.data.generatedBy, 'user-789');
    assert.ok(updatedArchivalData.data.generatedAt instanceof Date);

    console.log('✅ Test Case 2 Passed: PDF generated successfully and archival metadata saved.');
  } catch (err) {
    console.error('❌ Test Case 2 Failed:', err);
    process.exit(1);
  }

  // Test Case 3: Print Preview HTML for INVOICE, RECEIPT, CONSENT_FORM
  try {
    const invoiceRes = await service.generateDocument('hosp-123', {
      documentType: 'INVOICE',
      targetId: 'est-123',
      isPrintPreview: true
    }, userContext);
    assert.strictEqual(invoiceRes.format, 'html');
    assert.ok(invoiceRes.content.includes('TAX INVOICE'));

    const receiptRes = await service.generateDocument('hosp-123', {
      documentType: 'RECEIPT',
      targetId: 'est-123',
      isPrintPreview: true
    }, userContext);
    assert.strictEqual(receiptRes.format, 'html');
    assert.ok(receiptRes.content.includes('PAYMENT RECEIPT'));

    const consentRes = await service.generateDocument('hosp-123', {
      documentType: 'CONSENT_FORM',
      targetId: 'est-123',
      isPrintPreview: true
    }, userContext);
    assert.strictEqual(consentRes.format, 'html');
    assert.ok(consentRes.content.includes('INFORMED CONSENT'));

    console.log('✅ Test Case 3 Passed: Invoice, Receipt, and Consent templates render correctly.');
  } catch (err) {
    console.error('❌ Test Case 3 Failed:', err);
    process.exit(1);
  }

  console.log('--- All Documents Module Tests Passed Successfully ---');
}

runTests();
