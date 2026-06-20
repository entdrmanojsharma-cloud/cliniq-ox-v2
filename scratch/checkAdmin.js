require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const admin = await prisma.user.findFirst({ where: { email: 'admin@cliniqox.com' } });
  console.log('Admin user exists:', !!admin);
  const hospital = await prisma.hospitalProfile.findUnique({ where: { code: 'CLKOX' } });
  console.log('Hospital CLKOX exists:', !!hospital);
  await prisma.$disconnect();
})();
