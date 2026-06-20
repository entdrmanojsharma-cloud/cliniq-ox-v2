const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Dropping constraint users_hospital_id_email_key...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_hospital_id_email_key";`);
    console.log('Constraint dropped successfully!');
  } catch (err) {
    console.error('Failed to drop constraint:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
