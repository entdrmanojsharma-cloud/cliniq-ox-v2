const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: ['doctor@cliniqox.com', 'manoj', 'admin@cliniqox.com', 'admin']
      }
    }
  });
  console.log(users.map(u => ({
    username: u.username,
    plainPassword: u.plainPassword,
    passwordHash: u.passwordHash,
    role: u.role
  })));
}

main().catch(err => console.error(err));
