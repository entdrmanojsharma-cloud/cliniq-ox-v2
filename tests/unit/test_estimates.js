/* 
  Purpose: Unit tests for testing Estimates calculation engine logic.
  Responsibility: Assert correctness of subtotals, GST, print flags, and backward compatibility.
*/

const assert = require('assert');
const EstimatesService = require('../../backend/modules/estimates/service');

// Mock Prisma client
const mockPrisma = {
  hospitalProfile: {
    findUnique: async () => ({ defaultGstRate: 18.00, estimatePrefix: 'EST' })
  },
  surgeryMaster: {
    findFirst: async ({ where }) => {
      if (where.id === 'surg-1') return { defaultSurgeonFee: 10000.00 };
      if (where.id === 'surg-2') return { defaultSurgeonFee: 5000.00 };
      return null;
    }
  },
  calendarEvent: {
    findFirst: async () => ({ otRoomId: 'ot-room-1' })
  },
  otRoomMaster: {
    findFirst: async () => ({ defaultHourlyCharge: 2000.00 })
  },
  hospitalChargeMaster: {
    findFirst: async () => ({ defaultRate: 1500.00 }) // Anaesthesia
  },
  roomMaster: {
    findFirst: async () => ({ defaultDailyCharge: 3000.00 })
  },
  billingDefaults: {
    findUnique: async () => ({
      otCharge: 0,
      gaCharge: 0,
      localAnaesthesiaCharge: 0,
      sedationCharge: 0,
      surgeonCharge: 0,
      assistantSurgeonCharge: 0,
      roomCharge: 0,
      icuCharge: 0,
      wardCharge: 0,
      nursingCharge: 0,
      monitoringCharge: 0,
      dressingCharge: 0,
      consumableCharge: 0,
      equipmentCharge: 0,
      admissionCharge: 0,
      registrationCharge: 0
    })
  }
};

const mockRepository = {};

const service = new EstimatesService(mockRepository, mockPrisma);

async function runTests() {
  console.log('--- Starting Estimates Calculation Tests ---');

  // Test Case 1: Surgery percentage discount, OT/Anaesthesia duration, Room charge, line items taxable
  const payload1 = {
    eventId: 'evt-123',
    roomId: 'room-123',
    expectedDurationMinutes: 120, // 2 hours -> Calculated OT = 4000, Anaesthesia = 3000
    expectedStayDays: 3, // Room = 9000, Nursing = 1500, Service = 300
    icuDays: 1, // ICU = 5000
    icuDailyRate: 5000.00,
    nursingDailyRate: 500.00,
    serviceDailyRate: 100.00,
    gstRate: 18.00,
    discountType: 'FIXED_AMOUNT',
    discountValue: 1000.00, // Global discount
    surgeries: [
      {
        surgeryId: 'surg-1', // Base = 10000
        discountType: 'PERCENTAGE',
        discountValue: 10.00 // 10% -> Final = 9000
      },
      {
        surgeryId: 'surg-2', // Base = 5000
        discountType: 'FIXED_AMOUNT',
        discountValue: 1000.00 // -> Final = 4000
      }
    ],
    items: [
      {
        chargeCategory: 'OT_MEDICATION',
        description: 'Propofol',
        quantity: 2,
        rate: 600.00, // Original = 1200
        discountType: 'FIXED_AMOUNT',
        discountValue: 200.00, // Final = 1000
        isPrintable: true,
        isTaxable: true
      },
      {
        chargeCategory: 'IMPLANT',
        description: 'Stent',
        quantity: 1,
        rate: 8000.00, // Original = 8000
        discountType: 'PERCENTAGE',
        discountValue: 5.00, // Final = 7600
        isPrintable: true,
        isTaxable: false // NOT TAXABLE
      }
    ]
  };

  try {
    const res = await service.performCalculations('hosp-123', payload1, null);

    // Surgeries Assertions:
    assert.strictEqual(res.surgeries[0].surgeryCost, 10000.00);
    assert.strictEqual(res.surgeries[0].discountAmount, 1000.00);
    assert.strictEqual(res.surgeries[0].discountPct, 10.00);
    assert.strictEqual(res.surgeries[0].finalAmount, 9000.00);

    assert.strictEqual(res.surgeries[1].surgeryCost, 5000.00);
    assert.strictEqual(res.surgeries[1].discountAmount, 1000.00);
    assert.strictEqual(res.surgeries[1].discountPct, 20.00); // 1000/5000 * 100
    assert.strictEqual(res.surgeries[1].finalAmount, 4000.00);

    // OT Charges Assertions:
    assert.strictEqual(res.calculatedOtCharge, 4000.00); // 2 hours * 2000
    assert.strictEqual(res.actualOtCharge, 4000.00);
    assert.strictEqual(res.otDiscountAmount, 0.00);
    assert.strictEqual(res.roomFinalAmount, 9000.00); // 3 * 3000

    // Item Assertions:
    assert.strictEqual(res.items[0].originalAmount, 1200.00);
    assert.strictEqual(res.items[0].discountAmount, 200.00);
    assert.strictEqual(res.items[0].amount, 1000.00);
    assert.strictEqual(res.items[0].isTaxable, true);

    assert.strictEqual(res.items[1].originalAmount, 8000.00);
    assert.strictEqual(res.items[1].discountAmount, 400.00);
    assert.strictEqual(res.items[1].amount, 7600.00);
    assert.strictEqual(res.items[1].isTaxable, false);

    // Subtotal Assertions:
    // Surgeries (9000 + 4000) = 13000
    // OT = 4000
    // Anaesthesia = 3000
    // Room = 9000
    // Nursing = 1500
    // ICU = 5000
    // Service = 300
    // Items (1000 + 7600) = 8600
    // Total Subtotal = 13000 + 4000 + 3000 + 9000 + 1500 + 5000 + 300 + 8600 = 44400.00
    assert.strictEqual(res.subtotal, 44400.00);

    // Taxable Amount Assertions:
    // Taxable Subtotal = Subtotal - Non-Taxable item = 44400 - 7600 = 36800.00
    // Taxable Amount = Taxable Subtotal - Global Discount (1000) = 36800 - 1000 = 35800.00
    assert.strictEqual(res.taxableAmount, 35800.00);

    // GST Assertions:
    // GST = 35800.00 * 0.18 = 6444.00
    assert.strictEqual(res.gstAmount, 6444.00);

    // Grand Total Assertions:
    // Grand Total = Taxable Amount + GST + Non-Taxable item = 35800.00 + 6444.00 + 7600.00 = 49844.00
    assert.strictEqual(res.grandTotal, 49844.00);

    console.log('✅ Test Case 1 Passed!');

    // Test Case 2: Day Care (0 Days stay, room rate 3000 -> roomOriginalAmount and roomFinalAmount should be 3000)
    const payload2 = {
      eventId: 'evt-123',
      roomId: 'room-123',
      expectedDurationMinutes: 60, // 1 hour -> Calculated OT = 2000, Anaesthesia = 1500
      expectedStayDays: 0, // Day Care
      icuDays: 0,
      surgeries: [
        {
          surgeryId: 'surg-1', // Base = 10000 -> Final = 10000
          discountType: 'PERCENTAGE',
          discountValue: 0.00
        }
      ]
    };

    const res2 = await service.performCalculations('hosp-123', payload2, null);
    
    // Day Care Room assertions:
    assert.strictEqual(res2.expectedStayDays, 0);
    assert.strictEqual(res2.roomDailyRate, 3000.00);
    assert.strictEqual(res2.roomOriginalAmount, 3000.00); // 1 * roomDailyRate (fixed)
    assert.strictEqual(res2.roomFinalAmount, 3000.00);

    // Nursing should be 0 because expectedStayDays is 0
    assert.strictEqual(res2.nursingOriginalAmount, 0.00);
    assert.strictEqual(res2.nursingFinalAmount, 0.00);

    console.log('✅ Test Case 2 (Day Care Bed Charge) Passed!');

  } catch (err) {
    console.error('❌ Test Case Failed:', err);
    process.exit(1);
  }

  console.log('--- All Calculations Tests Passed Successfully ---');
}

runTests();
