import { prisma } from '../db';
import { csvToList, estimateSeconds, voiceById } from '../domain';
import { refreshNiches } from './news';

export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** Screen 09 header: "Good morning, Aarav -" */
export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Build (or return) today's personalised brief.
 *
 * Personalisation comes from three preference signals:
 *   niches       -> which stories qualify
 *   briefMinutes -> how many make the cut
 *   voiceId      -> who narrates them
 *
 * Stories are interleaved round-robin across the user's niches so a single
 * busy topic can't crowd out the rest of the brief.
 */
export async function getOrCreateTodaysBrief(userId: string, opts: { refresh?: boolean } = {}) {
  const date = todayKey();

  const existing = await prisma.brief.findUnique({
    where: { userId_date: { userId, date } },
    include: { items: { include: { story: true }, orderBy: { order: 'asc' } } },
  });
  if (existing && !opts.refresh) return existing;

  const pref = await prisma.preference.findUnique({ where: { userId } });
  const niches = csvToList(pref?.niches ?? 'ai-tech,markets,startups');
  const minutes = pref?.briefMinutes ?? 5;
  const voiceId = pref?.voiceId ?? 'aria';

  // Best effort: top up the pool with live articles for these niches.
  await refreshNiches(niches).catch(() => 0);

  // Roughly one story per ~3 minutes of requested brief, clamped to the design's range.
  const targetCount = Math.min(10, Math.max(3, Math.round(minutes / 3) + 3));

  const perNiche = await Promise.all(
    niches.map((category) =>
      prisma.story.findMany({
        where: { category },
        orderBy: { publishedAt: 'desc' },
        take: targetCount,
      }),
    ),
  );

  // Round-robin interleave so every chosen niche is represented near the top.
  const picked: typeof perNiche[number] = [];
  const seen = new Set<string>();
  for (let depth = 0; picked.length < targetCount && depth < targetCount; depth++) {
    for (const bucket of perNiche) {
      const story = bucket[depth];
      if (!story || seen.has(story.id)) continue;
      seen.add(story.id);
      picked.push(story);
      if (picked.length >= targetCount) break;
    }
  }

  // Fall back to anything recent if the user's niches are thin.
  if (picked.length < 3) {
    const filler = await prisma.story.findMany({
      where: { id: { notIn: [...seen] } },
      orderBy: { publishedAt: 'desc' },
      take: targetCount - picked.length,
    });
    picked.push(...filler);
  }

  const items = picked.map((story, order) => ({
    storyId: story.id,
    order,
    durationSec: estimateSeconds(`${story.title}. ${story.summary}`),
  }));

  const totalSeconds = items.reduce((sum, i) => sum + i.durationSec, 0);

  if (existing) {
    await prisma.briefItem.deleteMany({ where: { briefId: existing.id } });
    await prisma.brief.update({
      where: { id: existing.id },
      data: {
        voiceId,
        totalSeconds,
        currentIndex: 0,
        positionSec: 0,
        completed: false,
        items: { create: items },
      },
    });
  } else {
    await prisma.brief.create({
      data: {
        userId,
        date,
        greeting: greetingFor(),
        voiceId,
        totalSeconds,
        items: { create: items },
      },
    });
  }

  return prisma.brief.findUnique({
    where: { userId_date: { userId, date } },
    include: { items: { include: { story: true }, orderBy: { order: 'asc' } } },
  });
}

/** Shape the brief for screen 09. */
export function serialiseBrief(
  brief: NonNullable<Awaited<ReturnType<typeof getOrCreateTodaysBrief>>>,
  userName: string,
) {
  const voice = voiceById(brief.voiceId);
  return {
    id: brief.id,
    date: brief.date,
    greeting: `${brief.greeting}, ${userName.split(' ')[0]}`,
    storyCount: brief.items.length,
    totalSeconds: brief.totalSeconds,
    voice: { id: voice.id, name: voice.name, speechLocale: voice.speechLocale, pitch: voice.pitch, rate: voice.rate },
    playback: {
      currentIndex: brief.currentIndex,
      positionSec: brief.positionSec,
      completed: brief.completed,
    },
    stories: brief.items.map((item) => ({
      id: item.story.id,
      order: item.order,
      title: item.story.title,
      summary: item.story.summary,
      source: item.story.source,
      category: item.story.category,
      url: item.story.url,
      imageUrl: item.story.imageUrl,
      readMinutes: item.story.readMinutes,
      durationSec: item.durationSec,
      played: item.played,
      publishedAt: item.story.publishedAt,
    })),
  };
}
