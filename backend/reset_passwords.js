const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const usersToUpdate = ['admin', 'drpriyanka', 'doctor_dummy', 'admin@cliniqox.com', 'doctor@cliniqox.com', 'receptionist@cliniqox.com'];
  
  for (const username of usersToUpdate) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
      await prisma.user.update({
        where: { username },
        data: { passwordHash }
      });
      console.log(`Reset ${username} password to password123`);
    } else {
      console.log(`User ${username} not found`);
    }
  }
}
main().finally(() => prisma.$disconnect());
