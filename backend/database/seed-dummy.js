const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting dummy seeding...');

  // Get the first hospital profile
  const h1 = await prisma.hospitalProfile.findFirst({
    where: { code: 'CLKOX' }
  });

  if (!h1) {
    console.error('Hospital CLKOX not found. Please run the main seed.js first.');
    return;
  }

  // Find or create dummy doctor users
  const createDummyDoctorUser = async (username, fname, lname, spec) => {
    let user = await prisma.user.findFirst({ where: { username } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          hospitalId: h1.id,
          username: username,
          passwordHash: '$2b$10$SampleHashForTestingDoctor123',
          role: 'DOCTOR'
        }
      });
    }

    // Create doctor profile if not exists
    let doc = await prisma.doctor.findFirst({ where: { userId: user.id } });
    if (!doc) {
      doc = await prisma.doctor.create({
        data: {
          hospitalId: h1.id,
          userId: user.id,
          firstName: fname,
          lastName: lname,
          specialty: spec,
          licenseNumber: `MCI-${Math.floor(Math.random() * 100000)}`,
          defaultSurgeonFee: 15000.00
        }
      });
    }
    return doc;
  };

  await createDummyDoctorUser('doctor2@cliniqox.com', 'Gregory', 'House', 'Diagnostic Medicine');
  await createDummyDoctorUser('doctor3@cliniqox.com', 'Derek', 'Shepherd', 'Neurosurgery');
  await createDummyDoctorUser('doctor4@cliniqox.com', 'Meredith', 'Grey', 'General Surgery');

  // Add more dummy OT Rooms
  await prisma.otRoomMaster.upsert({
    where: { hospitalId_roomName: { hospitalId: h1.id, roomName: 'OT Room B' } },
    update: {},
    create: { hospitalId: h1.id, roomName: 'OT Room B', defaultHourlyCharge: 4000.00 }
  });
  await prisma.otRoomMaster.upsert({
    where: { hospitalId_roomName: { hospitalId: h1.id, roomName: 'OT Room C' } },
    update: {},
    create: { hospitalId: h1.id, roomName: 'OT Room C', defaultHourlyCharge: 4500.00 }
  });

  // Add more dummy Rooms
  await prisma.roomMaster.upsert({
    where: { hospitalId_roomName: { hospitalId: h1.id, roomName: 'General Ward A' } },
    update: {},
    create: { hospitalId: h1.id, roomName: 'General Ward A', roomType: 'GENERAL', defaultDailyCharge: 1500.00 }
  });
  await prisma.roomMaster.upsert({
    where: { hospitalId_roomName: { hospitalId: h1.id, roomName: 'ICU 1' } },
    update: {},
    create: { hospitalId: h1.id, roomName: 'ICU 1', roomType: 'ICU', defaultDailyCharge: 8000.00 }
  });

  // Add more Hospital Charges
  await prisma.hospitalChargeMaster.upsert({
    where: { hospitalId_chargeName: { hospitalId: h1.id, chargeName: 'Oxygen Support' } },
    update: {},
    create: { hospitalId: h1.id, chargeName: 'Oxygen Support', chargeCategory: 'CONSUMABLE', defaultRate: 500.00, unitType: 'PER_HOUR' }
  });
  await prisma.hospitalChargeMaster.upsert({
    where: { hospitalId_chargeName: { hospitalId: h1.id, chargeName: 'Blood Transfusion' } },
    update: {},
    create: { hospitalId: h1.id, chargeName: 'Blood Transfusion', chargeCategory: 'CONSUMABLE', defaultRate: 2000.00, unitType: 'FIXED' }
  });

  // Add more dummy Surgeries
  await prisma.surgeryMaster.upsert({
    where: { hospitalId_surgeryCode: { hospitalId: h1.id, surgeryCode: 'SURG-CABG' } },
    update: {},
    create: { hospitalId: h1.id, surgeryCode: 'SURG-CABG', surgeryName: 'Coronary Artery Bypass', category: 'CARDIOLOGY', defaultSurgeonFee: 50000.00 }
  });
  await prisma.surgeryMaster.upsert({
    where: { hospitalId_surgeryCode: { hospitalId: h1.id, surgeryCode: 'SURG-CRAN' } },
    update: {},
    create: { hospitalId: h1.id, surgeryCode: 'SURG-CRAN', surgeryName: 'Craniotomy', category: 'NEUROLOGY', defaultSurgeonFee: 75000.00 }
  });

  console.log('Dummy seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
