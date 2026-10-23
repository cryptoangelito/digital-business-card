const { PrismaClient } = require('@prisma/client');
const data = require('./profile-data.json');

// Atomic reconciliation. Repeated runs do not duplicate rows; child IDs may change.
async function seed(prisma) {
  const { skills, experience, projects, ...profile } = data;
  return prisma.profile.upsert({
    where: { slug: 'main' },
    create: {
      slug: 'main', ...profile,
      skills: { create: skills }, experience: { create: experience }, projects: { create: projects },
    },
    update: {
      ...profile,
      skills: { deleteMany: {}, create: skills },
      experience: { deleteMany: {}, create: experience },
      projects: { deleteMany: {}, create: projects },
    },
  });
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(() => console.log('Portfolio seed completed (profile: main).'))
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
module.exports = { seed };