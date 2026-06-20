const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- USERS ---');
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ id: u.id, username: u.username, role: u.role, hospitalId: u.hospitalId })));

  console.log('--- DOCTORS ---');
  const doctors = await prisma.doctor.findMany({
    include: {
      user: {
        select: {
          username: true
        }
      }
    }
  });
  console.log(doctors.map(d => ({
    id: d.id,
    userId: d.userId,
    firstName: d.firstName,
    lastName: d.lastName,
    specialty: d.specialty,
    licenseNumber: d.licenseNumber,
    hospitalId: d.hospitalId,
    isActive: d.isActive,
    username: d.user?.username
  })));
}

main().catch(err => console.error(err));
