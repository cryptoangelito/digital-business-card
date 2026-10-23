import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ProfileModel } from './models/profile.model';
import { RelationSelection } from './selection';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicProfile(relations: RelationSelection): Promise<ProfileModel | null> {
    // Avoid N+1: one Prisma call, relations loaded as a batch, only on demand.
    const include: Prisma.ProfileInclude = {};
    if (relations.skills) include.skills = { orderBy: { name: 'asc' } };
    if (relations.experience) include.experience = { orderBy: { sortOrder: 'asc' } };
    if (relations.projects) include.projects = { orderBy: { sortOrder: 'asc' } };

    const profile = await this.prisma.profile.findUnique({
      where: { slug: 'main' },
      include,
    });

    // Fields for unrequested relations are intentionally absent at runtime;
    // GraphQL serializes only the relations selected by this exact request.
    return profile as ProfileModel | null;
  }
}
