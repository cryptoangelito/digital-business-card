import { ProfileService } from './profile.service';
import { PrismaService } from '../database/prisma.service';

describe('ProfileService', () => {
  const findUnique = jest.fn();
  const service = new ProfileService({ profile: { findUnique } } as unknown as PrismaService);

  it('loads no relations for scalar fields and preserves null', async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(service.findPublicProfile({ skills: false, experience: false, projects: false })).resolves.toBeNull();
    expect(findUnique).toHaveBeenLastCalledWith({ where: { slug: 'main' }, include: {} });
  });

  it('batches requested relations with deterministic sorting', async () => {
    findUnique.mockResolvedValueOnce({ name: 'Test' });
    await service.findPublicProfile({ skills: true, experience: true, projects: true });
    expect(findUnique).toHaveBeenLastCalledWith({
      where: { slug: 'main' },
      include: {
        skills: { orderBy: { name: 'asc' } },
        experience: { orderBy: { sortOrder: 'asc' } },
        projects: { orderBy: { sortOrder: 'asc' } },
      },
    });
  });
});
