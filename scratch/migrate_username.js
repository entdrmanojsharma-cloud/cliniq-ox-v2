const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating email to username for existing users...');
  try {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users.`);
    for (const user of users) {
      if (!user.username && user.email) {
        console.log(`Updating user ${user.id}: email=${user.email}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { username: user.email }
        });
      }
    }
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
