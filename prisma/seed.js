// DEMO DATA. Replace your name, achievements, and URLs before publishing.
// Seed is deterministic and idempotent: re-running does not create duplicates.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const profileData = {
  name: 'Михаил',
  description: 'Изучаю backend-разработку, создаю pet-проекты и Telegram-сервисы. Интересуюсь Go, TypeScript, PostgreSQL и проектированием API.',
  githubUrl: 'https://github.com/REPLACE_WITH_YOUR_USERNAME',
  linkedinUrl: null,
  websiteUrl: null,
};

const skills = [
  { name: 'Go', category: 'Backend' },
  { name: 'TypeScript', category: 'Backend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'NestJS', category: 'Backend' },
  { name: 'GraphQL', category: 'API' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'Prisma', category: 'ORM' },
  { name: 'Docker', category: 'DevOps' },
  { name: 'Git', category: 'Tools' },
];

const experience = [
  {
    company: 'Личные проекты',
    position: 'Разработчик (учебные и pet-проекты)',
    period: '2026 — настоящее время',
    achievements: [
      'Разработка бэкенд-сервисов и Telegram-ботов в рамках самостоятельных проектов.',
      'Практика работы с Go, PostgreSQL и API.',
    ],
    sortOrder: 0,
  },
];

// All example.com links below are explicit placeholders, NOT real repositories.
const projects = [
  {
    name: 'EnzoVPN',
    description: 'Telegram-бот на Go с PostgreSQL. Учебный/личный проект.',
    url: 'https://example.com/REPLACE_WITH_ENZOVPN_REPOSITORY',
    sortOrder: 0,
  },
  {
    name: 'MONSTERA',
    description: 'Прототип коллекционной игры: Go REST API, PostgreSQL и фронтенд.',
    url: 'https://example.com/REPLACE_WITH_MONSTERA_REPOSITORY',
    sortOrder: 1,
  },
];

async function main() {
  await prisma.profile.upsert({
    where: { slug: 'main' },
    create: {
      slug: 'main',
      ...profileData,
      skills: { create: skills },
      experience: { create: experience },
      projects: { create: projects },
    },
    update: {
      ...profileData,
      skills: { deleteMany: {}, create: skills },
      experience: { deleteMany: {}, create: experience },
      projects: { deleteMany: {}, create: projects },
    },
  });
  console.log('Portfolio seed completed (profile: main).');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
