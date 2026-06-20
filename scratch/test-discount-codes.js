const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== DISCOUNT CODE SYSTEM INTEGRATION TESTS ===");

  // Find or create hospital
  let hospital = await prisma.hospitalProfile.findFirst();
  if (!hospital) {
    hospital = await prisma.hospitalProfile.create({
      data: {
        code: 'HOSP-TEST',
        name: 'Test Hospital',
        address: 'Test Address',
        phone: '1234567890',
        email: 'test@hospital.com'
      }
    });
  }
  const hospitalId = hospital.id;
  console.log("Using Hospital ID:", hospitalId);

  // Find or create a doctor user
  let user = await prisma.user.findFirst({ where: { role: 'DOCTOR' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        username: 'test_doctor@hospital.com',
        passwordHash: 'dummy_hash',
        role: 'DOCTOR',
        firstName: 'Test',
        lastName: 'Doctor',
        hospitalId
      }
    });
  }
  
  let doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  if (!doctor) {
    doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        hospitalId,
        firstName: 'Test',
        lastName: 'Doctor',
        specialty: 'General Medicine',
        licenseNumber: 'LIC-TEST'
      }
    });
  }
  console.log("Using Doctor ID:", doctor.id);

  // Find or create receptionist user
  let receptionist = await prisma.user.findFirst({ where: { role: 'RECEPTIONIST' } });
  if (!receptionist) {
    receptionist = await prisma.user.create({
      data: {
        username: 'test_receptionist@hospital.com',
        passwordHash: 'dummy_hash',
        role: 'RECEPTIONIST',
        firstName: 'Test',
        lastName: 'Receptionist',
        hospitalId
      }
    });
  }
  console.log("Using Receptionist ID:", receptionist.id);

  // Clear existing test codes
  await prisma.discountCode.deleteMany({
    where: { hospitalId, code: { in: ['TESTPERCENT', 'TESTFIXED', 'TESTEXPIRED', 'TESTLIMIT'] } }
  });

  console.log("\n1. Creating test discount codes...");
  
  const testPercent = await prisma.discountCode.create({
    data: {
      hospitalId,
      code: 'TESTPERCENT',
      description: '10% Percentage Discount Code',
      discountType: 'PERCENTAGE',
      value: 10.00,
      validFrom: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      validTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days later
      usageLimit: 10,
      createdByRole: 'DOCTOR',
      createdByUserId: user.id,
      doctorId: doctor.id,
      status: 'ACTIVE'
    }
  });
  console.log("Created code TESTPERCENT:", testPercent.id);

  const testExpired = await prisma.discountCode.create({
    data: {
      hospitalId,
      code: 'TESTEXPIRED',
      description: 'Expired Code',
      discountType: 'PERCENTAGE',
      value: 5.00,
      validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      validTo: new Date(Date.now() - 1000 * 60 * 60 * 2), // expired 2 hrs ago
      usageLimit: 5,
      createdByRole: 'ADMIN',
      createdByUserId: user.id,
      status: 'ACTIVE'
    }
  });
  console.log("Created code TESTEXPIRED:", testExpired.id);

  console.log("\n2. Testing Code Validation...");

  // Validate active code
  const val1 = await prisma.discountCode.findUnique({
    where: { hospitalId_code: { hospitalId, code: 'TESTPERCENT' } }
  });
  if (val1 && val1.status === 'ACTIVE' && new Date() < val1.validTo && new Date() > val1.validFrom && val1.usageCount < val1.usageLimit) {
    console.log("✓ TESTPERCENT validated successfully.");
  } else {
    throw new Error("TESTPERCENT validation failed.");
  }

  // Validate expired code
  const val2 = await prisma.discountCode.findUnique({
    where: { hospitalId_code: { hospitalId, code: 'TESTEXPIRED' } }
  });
  if (val2 && new Date() > val2.validTo) {
    console.log("✓ TESTEXPIRED correctly detected as expired.");
  } else {
    throw new Error("TESTEXPIRED validation failed.");
  }

  console.log("\n3. Testing Access Request Flow...");
  // Clear any existing request
  await prisma.discountCodeAccessRequest.deleteMany({
    where: { hospitalId, requestedByUserId: receptionist.id }
  });

  const request = await prisma.discountCodeAccessRequest.create({
    data: {
      hospitalId,
      requestedByUserId: receptionist.id,
      requestedByName: 'Test Receptionist',
      status: 'PENDING'
    }
  });
  console.log("Created access request PENDING:", request.id);

  // Approve request
  const approvedReq = await prisma.discountCodeAccessRequest.update({
    where: { id: request.id },
    data: {
      status: 'APPROVED',
      approvedByUserId: user.id,
      approvedByName: 'Dr. Test Doctor'
    }
  });
  console.log("Approved request status:", approvedReq.status);
  
  // Verify access request active (last 24 hours)
  const activeAccess = await prisma.discountCodeAccessRequest.findFirst({
    where: {
      hospitalId,
      requestedByUserId: receptionist.id,
      status: 'APPROVED',
      updatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  });
  if (activeAccess) {
    console.log("✓ Access request active and verified.");
  } else {
    throw new Error("Access request active verification failed.");
  }

  console.log("\n4. Testing Audit Logs & Usage Increments...");
  
  // Simulate applying code in an estimate context
  // Let's create an estimate to apply it on
  let patient = await prisma.patient.findFirst({ where: { hospitalId } });
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        hospitalId,
        name: 'Test Patient',
        mobile: '1234567890',
        uhid: 'UHID-TEST',
        gender: 'MALE',
        dateOfBirth: new Date('1995-01-01')
      }
    });
  }

  let event = await prisma.calendarEvent.findFirst({ where: { hospitalId } });
  if (!event) {
    event = await prisma.calendarEvent.create({
      data: {
        hospitalId,
        title: 'Surgery Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 1000 * 60 * 60),
        patientId: patient.id,
        eventType: 'SURGERY',
        createdBy: user.id
      }
    });
  } else {
    await prisma.estimate.deleteMany({ where: { eventId: event.id } });
  }

  // Clear past test audit logs
  await prisma.discountCodeAuditLog.deleteMany({
    where: { hospitalId, codeApplied: 'TESTPERCENT' }
  });

  const estimate = await prisma.estimate.create({
    data: {
      hospitalId,
      estimateNumber: 'EST-TEST-0001',
      eventId: event.id,
      subtotal: 10000.00,
      discount: 1000.00,
      taxableAmount: 9000.00,
      grandTotal: 10620.00, // with 18% GST
      gstRate: 18.00,
      gstAmount: 1620.00,
      status: 'DRAFT',
      billingStatus: 'PENDING',
      discountCode: 'TESTPERCENT',
      discountCodeBenefit: 1000.00
    }
  });
  console.log("Created estimate with discount code applied:", estimate.estimateNumber);

  // Increment usage count on discount code
  await prisma.discountCode.update({
    where: { id: testPercent.id },
    data: { usageCount: { increment: 1 } }
  });
  const updatedCode = await prisma.discountCode.findUnique({ where: { id: testPercent.id } });
  console.log("Incremented usageCount of TESTPERCENT:", updatedCode.usageCount);

  // Log in Audit Table
  const auditLog = await prisma.discountCodeAuditLog.create({
    data: {
      hospitalId,
      estimateId: estimate.id,
      estimateNumber: estimate.estimateNumber,
      patientName: patient.name,
      codeApplied: 'TESTPERCENT',
      discountAmount: 1000.00,
      appliedByUserId: receptionist.id,
      appliedByName: 'Test Receptionist',
      doctorId: doctor.id,
      doctorName: 'Dr. Test Doctor'
    }
  });
  console.log("Logged applied code into audit log ID:", auditLog.id);

  // Verify Audit Log is present
  const auditVerification = await prisma.discountCodeAuditLog.findUnique({
    where: { id: auditLog.id }
  });
  if (auditVerification) {
    console.log("✓ Audit log successfully verified in db.");
  } else {
    throw new Error("Audit log verification failed.");
  }

  // Cleanup testing estimate
  await prisma.discountCodeAuditLog.delete({ where: { id: auditLog.id } });
  await prisma.estimate.delete({ where: { id: estimate.id } });
  
  console.log("\n=== ALL INTEGRATION TESTS PASSED ===");
}

main()
  .catch(e => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
