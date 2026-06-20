/**
 * One-time script to set firstName/lastName on existing users
 * that were created before the name fields were added.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNames() {
  // Find all users missing firstName
  const users = await prisma.user.findMany({
    where: { firstName: null },
    select: { id: true, username: true, role: true, hospitalId: true }
  });

  console.log(`Found ${users.length} user(s) without firstName/lastName:\n`);

  for (const u of users) {
    console.log(`  → ${u.username} (${u.role})`);
  }

  // Update the superadmin
  const superAdmin = users.find(u => u.role === 'SUPER_ADMIN');
  if (superAdmin) {
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { firstName: 'Super', lastName: 'Admin' }
    });
    console.log(`\n✅ Updated superadmin "${superAdmin.username}" → Super Admin`);
  }

  // For hospital admins, try to derive a name from the hospital
  const admins = users.filter(u => u.role === 'ADMIN' && u.hospitalId);
  for (const admin of admins) {
    const hospital = await prisma.hospitalProfile.findUnique({
      where: { id: admin.hospitalId },
      select: { name: true }
    });
    if (hospital) {
      // Use "Admin" as firstName and hospital name as context
      await prisma.user.update({
        where: { id: admin.id },
        data: { firstName: 'Admin', lastName: hospital.name.split(' ')[0] }
      });
      console.log(`✅ Updated admin "${admin.username}" → Admin ${hospital.name.split(' ')[0]}`);
    }
  }

  // For other staff (doctors, receptionists), leave as-is — they can be edited in the Staff modal
  const others = users.filter(u => !['SUPER_ADMIN', 'ADMIN'].includes(u.role));
  if (others.length > 0) {
    console.log(`\nℹ️  ${others.length} other staff user(s) still need names set via the Staff modal.`);
  }

  console.log('\nDone!');
  await prisma.$disconnect();
}

fixNames().catch(e => { console.error(e); process.exit(1); });
