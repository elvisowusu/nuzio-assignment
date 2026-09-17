import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.story.count();
  const seeded = await prisma.story.count({ where: { externalId: { startsWith: 'seed:' } } });
  console.log(`total: ${total} | seeded: ${seeded} | live: ${total - seeded}`);

  const live = await prisma.story.findMany({
    where: { NOT: { externalId: { startsWith: 'seed:' } } },
    orderBy: { publishedAt: 'desc' },
    take: 8,
  });

  for (const s of live) {
    console.log(`  [${s.category}] ${s.source} - ${s.title.slice(0, 62)} | ${s.publishedAt.toISOString().slice(0, 16)}`);
  }
}

main().finally(() => prisma.$disconnect());
