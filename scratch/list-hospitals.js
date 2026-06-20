const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: ['admin', 'adminflorence']
      }
    },
    select: {
      username: true,
      plainPassword: true,
      passwordHash: true,
      role: true
    }
  });
  console.log('User Credentials:', JSON.stringify(users, null, 2));
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
