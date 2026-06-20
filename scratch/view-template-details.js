const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying estimate template...');
  const template = await prisma.estimateTemplate.findFirst({
    where: {
      templateName: {
        contains: 'Premium Bypass',
        mode: 'insensitive'
      }
    },
    include: {
      templateItems: true
    }
  });

  if (!template) {
    console.error('Template not found!');
    return;
  }

  console.log('--- Template Main Fields ---');
  console.log({
    id: template.id,
    templateName: template.templateName,
    templateType: template.templateType,
    packagePrice: template.packagePrice,
    includedItems: template.includedItems
  });

  console.log('\n--- Template Items ---');
  console.log(template.templateItems.map(item => ({
    id: item.id,
    itemType: item.itemType,
    description: item.description,
    defaultRate: item.defaultRate,
    defaultQuantity: item.defaultQuantity,
    itemGroup: item.itemGroup
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
