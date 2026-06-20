const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const billingDefaults = await prisma.billingDefaults.findMany({
    include: { hospital: true }
  });
  console.log('Billing Defaults in DB:', billingDefaults);
}

main().catch(console.error).finally(() => prisma.$disconnect());
