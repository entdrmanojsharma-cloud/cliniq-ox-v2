const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding dummy data...");

  const hospital = await prisma.hospitalProfile.upsert({
    where: { code: 'HOSP-001' },
    update: {},
    create: {
      code: 'HOSP-001',
      name: 'Dummy Hospital',
      address: '123 Dummy St',
      phone: '1234567890',
      email: 'hospital@dummy.com'
    }
  });

  const user = await prisma.user.upsert({
    where: { username: 'doctor_dummy' },
    update: {},
    create: {
      username: 'doctor_dummy',
      passwordHash: 'dummy_hash',
      role: 'DOCTOR',
      firstName: 'Dummy',
      lastName: 'Doctor',
      hospitalId: hospital.id
    }
  });

  const doctor = await prisma.doctor.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      hospitalId: hospital.id,
      firstName: 'Dummy',
      lastName: 'Doctor',
      specialty: 'General Surgery',
      licenseNumber: 'LIC-001'
    }
  });
  console.log("Created dummy doctor:", doctor.id);

  const patient = await prisma.patient.upsert({
    where: { hospitalId_uhid: { hospitalId: hospital.id, uhid: 'UHID-DUMMY' } },
    update: {},
    create: {
      hospitalId: hospital.id,
      name: 'Dummy Patient',
      mobile: '9999999999',
      uhid: 'UHID-DUMMY',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE'
    }
  });
  console.log("Created dummy patient:", patient.id);

  console.log("Seeding complete.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
