const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  
  await prisma.user.updateMany({
    where: { email: 'admin@cliniqox.com' },
    data: { passwordHash: hash }
  });

  await prisma.user.updateMany({
    where: { email: 'receptionist@cliniqox.com' },
    data: { passwordHash: hash }
  });

  await prisma.user.updateMany({
    where: { email: 'doctor@cliniqox.com' },
    data: { passwordHash: hash }
  });

  console.log('Passwords updated successfully to "password123"!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
