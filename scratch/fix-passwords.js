const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  
  const usernames = ['admin@cliniqox.com', 'receptionist@cliniqox.com', 'doctor@cliniqox.com'];
  
  for (const username of usernames) {
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hash,
          plainPassword: 'password123'
        }
      });
      console.log(`Updated password for user: ${username}`);
    } else {
      console.log(`User not found: ${username}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
