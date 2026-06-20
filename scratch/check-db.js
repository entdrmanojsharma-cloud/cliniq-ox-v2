const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, hospitalId: true, role: true }
  });
  console.log('Users:', users);

  const patients = await prisma.patient.findMany({
    select: { id: true, name: true, hospitalId: true, uhid: true }
  });
  console.log('Patients:', patients);

  const doctors = await prisma.doctor.findMany({
    select: { id: true, firstName: true, lastName: true, hospitalId: true }
  });
  console.log('Doctors:', doctors);
}

main().catch(console.error).finally(() => prisma.$disconnect());
