import { prisma } from '../src/db';
import { seedStories } from '../src/bootstrap';

seedStories()
  .then(async (written) => {
    const total = await prisma.story.count();
    console.log(`seeded - ${written} stories written, ${total} total in database`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
