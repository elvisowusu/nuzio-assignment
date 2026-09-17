import { config } from '../config';
import { prisma } from '../db';
import { NICHES, nicheById, estimateSeconds } from '../domain';

export interface IngestedStory {
  externalId: string;
  title: string;
  summary: string;
  body?: string;
  source: string;
  url?: string;
  imageUrl?: string;
  category: string;
  readMinutes: number;
  publishedAt: Date;
}

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: { name: string };
}

/**
 * Pull fresh stories for one niche from GNews.
 * Returns [] when no key is configured so callers fall back to seeded data.
 */
export async function fetchNicheFromGNews(nicheId: string, max = 6): Promise<IngestedStory[]> {
  if (!config.gnewsApiKey) return [];
  const niche = nicheById(nicheId);
  if (!niche) return [];

  const url = new URL('https://gnews.io/api/v4/search');
  url.searchParams.set('q', niche.query);
  url.searchParams.set('lang', 'en');
  url.searchParams.set('country', 'in');
  url.searchParams.set('max', String(max));
  url.searchParams.set('sortby', 'publishedAt');
  url.searchParams.set('apikey', config.gnewsApiKey);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[news] GNews ${res.status} for ${nicheId}`);
      return [];
    }
    const data = (await res.json()) as { articles?: GNewsArticle[] };
    return (data.articles ?? []).map((a) => {
      const summary = (a.description || a.content || a.title).slice(0, 400);
      return {
        externalId: a.url,
        title: a.title,
        summary,
        body: a.content ?? undefined,
        source: (a.source?.name ?? 'GNews').toUpperCase(),
        url: a.url,
        imageUrl: a.image ?? undefined,
        category: nicheId,
        readMinutes: Math.max(1, Math.round(estimateSeconds(summary) / 60)),
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
      };
    });
  } catch (err) {
    console.warn(`[news] GNews fetch failed for ${nicheId}:`, (err as Error).message);
    return [];
  }
}

/** Upsert ingested stories, keyed on the article URL so re-runs stay idempotent. */
export async function persistStories(stories: IngestedStory[]): Promise<number> {
  let written = 0;
  for (const s of stories) {
    try {
      await prisma.story.upsert({
        where: { externalId: s.externalId },
        create: s,
        update: { title: s.title, summary: s.summary, imageUrl: s.imageUrl },
      });
      written += 1;
    } catch {
      /* duplicate or malformed article - skip */
    }
  }
  return written;
}

/**
 * Refresh the story pool for the given niches.
 * Silently no-ops when GNEWS_API_KEY is unset; seeded stories remain in play.
 */
export async function refreshNiches(nicheIds: string[]): Promise<number> {
  if (!config.gnewsApiKey) return 0;
  const wanted = nicheIds.filter((id) => nicheById(id));
  const batches = await Promise.all(wanted.map((id) => fetchNicheFromGNews(id)));
  return persistStories(batches.flat());
}

export const allNicheIds = NICHES.map((n) => n.id);
