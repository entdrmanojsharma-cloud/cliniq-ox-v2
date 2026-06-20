const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching users of role DOCTOR...');
  const users = await prisma.user.findMany({
    where: {
      role: 'DOCTOR'
    },
    include: {
      doctorProfile: true
    }
  });

  console.log(`Found ${users.length} DOCTOR user(s) total.`);

  let createdCount = 0;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user.doctorProfile) {
      console.log(`User ${user.username} (ID: ${user.id}) has no Doctor profile. Creating one...`);
      
      const licenseNumber = `LIC-${Date.now()}-${i}`;
      const doc = await prisma.doctor.create({
        data: {
          hospitalId: user.hospitalId,
          userId: user.id,
          firstName: user.firstName || 'Doctor',
          lastName: user.lastName || 'User',
          specialty: 'General',
          licenseNumber,
          defaultSurgeonFee: 0.00,
          isActive: user.isActive
        }
      });
      console.log(`Created profile for Dr. ${doc.firstName} ${doc.lastName} (License: ${doc.licenseNumber})`);
      createdCount++;
    } else {
      console.log(`User ${user.username} already has a Doctor profile (ID: ${user.doctorProfile.id}).`);
    }
  }

  console.log(`Database fix completed. Created ${createdCount} missing profile(s).`);
}

main()
  .catch(err => {
    console.error('Error running database fix:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
