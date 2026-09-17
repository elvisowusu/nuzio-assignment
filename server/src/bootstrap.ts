import { prisma } from './db';
import { estimateSeconds } from './domain';
import { SEED_AGE_MS, SEED_STORIES } from './seedData';

/**
 * Idempotent seed. Runs on every boot so a fresh deployment (where the
 * database starts empty) can serve a brief on its first request without a
 * manual seed step.
 */
export async function seedStories(): Promise<number> {
  const now = Date.now() - SEED_AGE_MS;
  let written = 0;

  for (const [i, [category, source, title, summary]] of SEED_STORIES.entries()) {
    const publishedAt = new Date(now - i * 37 * 60 * 1000); // staggered through the morning
    const seconds = estimateSeconds(`${title}. ${summary}`);

    await prisma.story.upsert({
      where: { externalId: `seed:${i}` },
      create: {
        externalId: `seed:${i}`,
        title,
        summary,
        source,
        category,
        readMinutes: Math.max(1, Math.round(seconds / 60)),
        publishedAt,
      },
      update: { title, summary, source, category, publishedAt },
    });
    written += 1;
  }

  return written;
}

/** Prepare the database for serving traffic. Safe to call repeatedly. */
export async function bootstrap(): Promise<void> {
  try {
    const written = await seedStories();
    const total = await prisma.story.count();
    console.log(`  seed        : ${written} baseline stories, ${total} total`);
  } catch (err) {
    // A seeding failure should never stop the API from coming up.
    console.warn('[bootstrap] seeding failed:', (err as Error).message);
  }
}
