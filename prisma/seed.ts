import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const repositories = await import('../src/lib/repositories.json', {
    assert: { type: 'json' }
  });

  // Create tags first
  for (const tag of repositories.default.tagsTable) {
    await prisma.tag.upsert({
      where: { id: tag.id },
      update: {},
      create: {
        id: tag.id,
        name: tag.name
      }
    });
  }

  // Then create repositories
  for (const repo of repositories.default.repoData) {
    await prisma.repository.create({
      data: {
        name: repo.name,
        link: repo.link,
        type: repo.type,
        size: repo.size,
        blurb: repo.blurb,
        tagIds: repo.tagIds.join(','),
        tags: {
          connect: repo.tagIds.map(id => ({ id }))
        }
      }
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });