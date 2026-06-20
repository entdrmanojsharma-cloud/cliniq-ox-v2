require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const newHash = '$2b$10$54YhI5Ql.R7pLe/lciMFteYqLPa/RbRKVnGQfpZCFTRrGiuDVieRK';
(async () => {
  const result = await prisma.user.updateMany({
    where: { email: 'admin@cliniqox.com' },
    data: { passwordHash: newHash }
  });
  console.log('Password update result count:', result.count);
  await prisma.$disconnect();
})();
