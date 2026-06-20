const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Recreating manoj and udit accounts, doctors, and test patient...');

  // 1. Get hospital CLKOX
  const hospital = await prisma.hospitalProfile.findUnique({
    where: { code: 'CLKOX' }
  });
  if (!hospital) {
    throw new Error('Hospital CLKOX not found. Please seed the DB first.');
  }

  // 2. Create/upsert user 'udit'
  const uditPasswordHash = await bcrypt.hash('11111111', 10);
  const uditUser = await prisma.user.upsert({
    where: { username: 'udit' },
    update: {
      passwordHash: uditPasswordHash,
      plainPassword: '11111111',
      role: 'ADMIN',
      isActive: true
    },
    create: {
      hospitalId: hospital.id,
      username: 'udit',
      passwordHash: uditPasswordHash,
      plainPassword: '11111111',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('Recreated user: udit (ADMIN)');

  // 3. Create/upsert user 'manoj'
  const manojPasswordHash = await bcrypt.hash('manoj123', 10);
  const manojUser = await prisma.user.upsert({
    where: { username: 'manoj' },
    update: {
      passwordHash: manojPasswordHash,
      plainPassword: 'manoj123',
      role: 'DOCTOR',
      isActive: true
    },
    create: {
      hospitalId: hospital.id,
      username: 'manoj',
      passwordHash: manojPasswordHash,
      plainPassword: 'manoj123',
      role: 'DOCTOR',
      isActive: true
    }
  });
  console.log('Recreated user: manoj (DOCTOR)');

  // 4. Create doctor profiles
  // Delete existing doctor profiles if we want to recreate them
  await prisma.doctor.deleteMany({
    where: {
      OR: [
        { userId: manojUser.id },
        { licenseNumber: 'MCI-88888' },
        { licenseNumber: 'MCI-99999' }
      ]
    }
  });

  // Manoj Kumar
  const docManojKumar = await prisma.doctor.create({
    data: {
      hospitalId: hospital.id,
      userId: manojUser.id,
      firstName: 'Manoj',
      lastName: 'Kumar',
      specialty: 'General Surgery',
      licenseNumber: 'MCI-99999',
      defaultSurgeonFee: 20000,
      isActive: true
    }
  });
  console.log('Recreated doctor: Dr. Manoj Kumar');

  // Manoj Sharma
  // For Manoj Sharma, let's create a separate doctor user or use doctor@cliniqox.com user to avoid userId unique constraint collision.
  const doctorUserCLKOX = await prisma.user.findUnique({
    where: { username: 'doctor@cliniqox.com' }
  });
  
  if (doctorUserCLKOX) {
    // Delete any existing doctor profile for this user to avoid conflicts
    await prisma.doctor.deleteMany({
      where: { userId: doctorUserCLKOX.id }
    });

    const docManojSharma = await prisma.doctor.create({
      data: {
        hospitalId: hospital.id,
        userId: doctorUserCLKOX.id,
        firstName: 'Manoj',
        lastName: 'Sharma',
        specialty: 'Cardiology',
        licenseNumber: 'MCI-88888',
        defaultSurgeonFee: 25000,
        isActive: true
      }
    });
    console.log('Recreated doctor: Dr. Manoj Sharma');
  }

  // 5. Create test patient 'abs test' for E2E verification
  const patient = await prisma.patient.upsert({
    where: {
      hospitalId_uhid: {
        hospitalId: hospital.id,
        uhid: 'CLKOX-TEST-001'
      }
    },
    update: {
      name: 'abs test',
      mobile: '9999999999',
      gender: 'MALE',
      dateOfBirth: new Date('1990-01-01')
    },
    create: {
      hospitalId: hospital.id,
      uhid: 'CLKOX-TEST-001',
      name: 'abs test',
      mobile: '9999999999',
      gender: 'MALE',
      dateOfBirth: new Date('1990-01-01')
    }
  });
  console.log('Recreated patient: abs test');

  console.log('Recreation completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
