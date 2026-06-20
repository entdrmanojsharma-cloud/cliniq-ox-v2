const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hospitals = await prisma.hospitalProfile.findMany();
  console.log('Hospitals:', hospitals);
  const users = await prisma.user.findMany({ select: { email: true, hospitalId: true, role: true } });
  console.log('Users:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
