const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      doctorProfile: true,
      hospital: true
    }
  });
  console.log('--- ALL USERS IN DB ---');
  for (const u of users) {
    console.log(`User: ${u.username} (ID: ${u.id}, Role: ${u.role})`);
    console.log(`  Hospital: ${u.hospital?.name} (ID: ${u.hospitalId})`);
    if (u.doctorProfile) {
      console.log(`  Doctor Profile: Dr. ${u.doctorProfile.firstName} ${u.doctorProfile.lastName} (ID: ${u.doctorProfile.id}, Active: ${u.doctorProfile.isActive})`);
    } else {
      console.log(`  Doctor Profile: None`);
    }
  }

  const doctors = await prisma.doctor.findMany({
    include: {
      hospital: true
    }
  });
  console.log('\n--- ALL DOCTORS IN DB ---');
  for (const d of doctors) {
    console.log(`Doctor: Dr. ${d.firstName} ${d.lastName} (ID: ${d.id}, Active: ${d.isActive})`);
    console.log(`  Hospital: ${d.hospital?.name} (ID: ${d.hospitalId})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
