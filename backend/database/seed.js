/* 
  Purpose: Database seeding script to populate mock initial records for testing and verification.
  Responsibility: Seed hospital profiles, users, doctors, rooms, charges, surgeries, and patients.
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Seed Hospital Profiles with Extended Settings
  const h1 = await prisma.hospitalProfile.upsert({
    where: { code: 'CLKOX' },
    update: {},
    create: {
      code: 'CLKOX',
      name: 'Cliniq-OX Hospital',
      address: '100 Medical Plaza, City Centre',
      gstNumber: '29ABCDE1234F1Z5',
      phone: '+919876543210',
      email: 'info@cliniqox.com',
      currency: 'INR',
      defaultGstRate: 18.00,
      estimatePrefix: 'EST',
      invoicePrefix: 'INV',
      receiptPrefix: 'REC',
      financialYearStart: '04-01'
    }
  });

  const h2 = await prisma.hospitalProfile.upsert({
    where: { code: 'DEMOM' },
    update: {},
    create: {
      code: 'DEMOM',
      name: 'Demo Medical Center',
      address: '404 Sample Road, Tech Park',
      gstNumber: '29FGHIJ5678K2Z6',
      phone: '+919998887776',
      email: 'contact@demomedical.com',
      currency: 'USD',
      defaultGstRate: 0.00,
      estimatePrefix: 'DEMO-EST',
      invoicePrefix: 'DEMO-INV',
      receiptPrefix: 'DEMO-REC',
      financialYearStart: '01-01'
    }
  });

  // Helper to seed users
  const adminUser = await prisma.user.create({
    data: {
      hospitalId: h1.id,
      username: 'admin@cliniqox.com',
      passwordHash: '$2b$10$SampleHashForTestingAdmin123',
      role: 'ADMIN'
    }
  });

  const receptionistUser = await prisma.user.create({
    data: {
      hospitalId: h1.id,
      username: 'receptionist@cliniqox.com',
      passwordHash: '$2b$10$SampleHashForTestingRecept123',
      role: 'RECEPTIONIST'
    }
  });

  const doctorUser = await prisma.user.create({
    data: {
      hospitalId: h1.id,
      username: 'doctor@cliniqox.com',
      passwordHash: '$2b$10$SampleHashForTestingDoctor123',
      role: 'DOCTOR'
    }
  });

  // 2. Seed Doctor Profiles
  const doctorProfile = await prisma.doctor.create({
    data: {
      hospitalId: h1.id,
      userId: doctorUser.id,
      firstName: 'Sarah',
      lastName: 'Conner',
      specialty: 'General Surgery',
      licenseNumber: 'MCI-12345',
      defaultSurgeonFee: 15000.00
    }
  });

  // 3. Seed Rooms & OTs
  const ot1 = await prisma.otRoomMaster.create({
    data: { hospitalId: h1.id, roomName: 'OT Room A', defaultHourlyCharge: 3500.00 }
  });
  const room1 = await prisma.roomMaster.create({
    data: { hospitalId: h1.id, roomName: 'Private Room 101', roomType: 'PRIVATE', defaultDailyCharge: 5000.00 }
  });

  // 4. Seed Charges Catalog
  await prisma.hospitalChargeMaster.createMany({
    data: [
      { hospitalId: h1.id, chargeName: 'OT Nursing Care', chargeCategory: 'OT_STAFF', defaultRate: 800.00, unitType: 'PER_HOUR' },
      { hospitalId: h1.id, chargeName: 'General Anaesthesia Base', chargeCategory: 'ANAESTHESIA', defaultRate: 6000.00, unitType: 'FIXED' }
    ]
  });

  // 5. Seed Surgery Catalog
  await prisma.surgeryMaster.createMany({
    data: [
      { hospitalId: h1.id, surgeryCode: 'SURG-APP', surgeryName: 'Appendectomy', category: 'GENERAL', defaultSurgeonFee: 25000.00 },
      { hospitalId: h1.id, surgeryCode: 'SURG-HER', surgeryName: 'Hernia Repair', category: 'GENERAL', defaultSurgeonFee: 20000.00 }
    ]
  });

  // 6. Seed Patients with auto-generated formatted UHIDs
  await prisma.patient.create({
    data: {
      hospitalId: h1.id,
      uhid: 'CLKOX-2026-000001',
      name: 'John Doe',
      dateOfBirth: new Date('1985-05-15'),
      gender: 'MALE',
      mobile: '+919900990099',
      address: 'Flat 302, Green Meadows, City Centre'
    }
  });

  await prisma.patient.create({
    data: {
      hospitalId: h2.id,
      uhid: 'DEMOM-2026-000001',
      name: 'Jane Smith',
      dateOfBirth: new Date('1990-08-20'),
      gender: 'FEMALE',
      mobile: '+918800880088',
      address: 'Villa 12, Pine Crest, Tech Park'
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
