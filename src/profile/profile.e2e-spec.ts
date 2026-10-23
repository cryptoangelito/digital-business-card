import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { PrismaClient } from '@prisma/client';
import { ProfileService } from './profile.service';

// Run against an isolated, migrated PostgreSQL database; never a production URL.
describe('GraphQL + PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let endpoint: string;

  beforeAll(async () => {
    if (process.env.ALLOW_TEST_DATABASE !== 'true') throw new Error('Set ALLOW_TEST_DATABASE=true for an isolated test database');
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, '0.0.0.0');
    endpoint = `${await app.getUrl()}/graphql`;
    prisma = app.get(PrismaService);
  });
  afterAll(async () => { if (app) await app.close(); });

  async function query(query: string, variables?: object) {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as {
      errors?: unknown[];
      data: { profile: { name: string; skills: { name: string }[]; experience: unknown[]; projects?: { name: string }[]; alias?: { name: string }[] } };
    };
  }

  it('reconciles seed twice without duplicate rows', async () => {
    const { seed } = require('../../prisma/seed');
    await seed(prisma);
    const counts = async () => Promise.all([prisma.profile.count(), prisma.skill.count(), prisma.experience.count(), prisma.project.count()]);
    const first = await counts();
    await seed(prisma);
    expect(await counts()).toEqual(first);
    expect(first).toEqual([1, 7, 0, 2]);
  });

  it('executes the employer query with real database relations', async () => {
    const result = await query('{ profile { name description skills { name } experience { company position } projects { name } } }');
    expect(result.errors).toBeUndefined();
    expect(result.data.profile.name).toBe('Бахвалов Михаил Алексеевич');
    expect(result.data.profile.skills).toHaveLength(7);
    expect(result.data.profile.experience).toEqual([]);
    expect(result.data.profile.projects).toEqual([{ name: 'Digital Business Card' }, { name: 'MONSTERA' }]);
  });

  it('supports aliases, fragments and variable directives', async () => {
    const result = await query('query($skip: Boolean!) { profile { alias: skills { name } ...P projects @skip(if: $skip) { name } } } fragment P on Profile { experience { company } }', { skip: true });
    expect(result.errors).toBeUndefined();
    expect(result.data.profile.alias).toHaveLength(7);
    expect(result.data.profile.projects).toBeUndefined();
  });

  it('serves the Apollo landing page', async () => {
    const response = await fetch(endpoint, { headers: { accept: 'text/html' } });
    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/apollo/i);
  });

  it('loads collections with a bounded number of SQL queries', async () => {
    const client = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
    const queries: string[] = [];
    client.$on('query', (event) => queries.push(event.query));
    try {
      const service = new ProfileService(client as PrismaService);
      await service.findPublicProfile({ skills: false, experience: false, projects: false });
      expect(queries).toHaveLength(1);
      queries.length = 0;
      const profile = await service.findPublicProfile({ skills: true, experience: true, projects: true });
      expect(profile?.skills).toHaveLength(7);
      expect(profile?.projects).toHaveLength(2);
      // One profile query plus at most one query per relation, independent of row count.
      expect(queries.length).toBeLessThanOrEqual(4);
    } finally { await client.$disconnect(); }
  });

  it('enforces skill uniqueness in PostgreSQL', async () => {
    const profile = await prisma.profile.findUniqueOrThrow({ where: { slug: 'main' }, include: { skills: true } });
    await expect(prisma.skill.create({ data: { profileId: profile.id, name: profile.skills[0].name } })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('returns null for a missing profile', async () => {
    await prisma.profile.update({ where: { slug: 'main' }, data: { slug: 'temporarily-hidden' } });
    try { expect(await query('{ profile { name } }')).toEqual({ data: { profile: null } }); }
    finally { await prisma.profile.update({ where: { slug: 'temporarily-hidden' }, data: { slug: 'main' } }); }
  });
});
