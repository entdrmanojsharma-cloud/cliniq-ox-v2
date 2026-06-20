const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const passwordHash = await bcrypt.hash('admin', 10);
  await prisma.user.update({
    where: { username: 'admin' },
    data: { passwordHash }
  });
  console.log('Successfully reset SUPER_ADMIN "admin" password to "admin"');
}

main().finally(() => prisma.$disconnect());
