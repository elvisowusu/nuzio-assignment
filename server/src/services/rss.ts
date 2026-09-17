import { XMLParser } from 'fast-xml-parser';
import { nicheById, estimateSeconds } from '../domain';
import type { IngestedStory } from './news';

/**
 * Google News RSS - live headlines with no API key, no account and no daily cap.
 *
 * This is the default live-news path. GNews is used instead when a key is
 * present (richer summaries and images); RSS is the dependable floor.
 */

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { '#text'?: string };
}

/** Google News titles arrive as "Headline - Publisher". */
function splitTitleAndSource(raw: string): { title: string; source: string | null } {
  const at = raw.lastIndexOf(' - ');
  if (at === -1) return { title: raw.trim(), source: null };
  return { title: raw.slice(0, at).trim(), source: raw.slice(at + 3).trim() };
}

/** Descriptions are an HTML link blob; strip to readable text. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** True when the description is more than a restatement of the headline. */
function addsDetail(description: string, title: string): boolean {
  if (description.length < 90) return false;

  const a = normalise(description);
  const b = normalise(title);
  if (a.startsWith(b) || a.includes(b)) return false;

  // Reject near-duplicates that merely reorder or truncate the headline.
  const titleWords = new Set(b.split(' ').filter((w) => w.length > 3));
  if (titleWords.size === 0) return true;

  const descWords = new Set(a.split(' ').filter((w) => w.length > 3));
  let shared = 0;
  for (const w of titleWords) if (descWords.has(w)) shared += 1;

  return shared / titleWords.size < 0.7;
}

export async function fetchNicheFromRss(nicheId: string, max = 6): Promise<IngestedStory[]> {
  const niche = nicheById(nicheId);
  if (!niche) return [];

  // Google News wants a plain phrase, not boolean syntax.
  const query = niche.query.replace(/\s+OR\s+/gi, ' ').trim();
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NuzioBot/1.0)' },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      console.warn(`[rss] ${res.status} for ${nicheId}`);
      return [];
    }

    const feed = parser.parse(await res.text());
    const raw = feed?.rss?.channel?.item;
    const items: RssItem[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return items.slice(0, max).flatMap((item) => {
      if (!item.title || !item.link) return [];

      const { title, source: fromTitle } = splitTitleAndSource(String(item.title));
      if (!title) return [];

      const sourceTag = typeof item.source === 'string' ? item.source : item.source?.['#text'];
      const source = (sourceTag ?? fromTitle ?? 'GOOGLE NEWS').toUpperCase();

      // Google News descriptions are usually just the headline again. Keep the
      // abstract only when it genuinely adds something, otherwise leave it
      // empty rather than echoing the title back at the reader.
      const described = item.description ? stripHtml(String(item.description)) : '';
      const summary = addsDetail(described, title) ? described.slice(0, 400) : '';

      return [{
        externalId: String(item.link),
        title,
        summary,
        source,
        url: String(item.link),
        category: nicheId,
        readMinutes: Math.max(1, Math.round(estimateSeconds(`${title}. ${summary}`) / 60)),
        publishedAt: item.pubDate ? new Date(String(item.pubDate)) : new Date(),
      }];
    });
  } catch (err) {
    console.warn(`[rss] fetch failed for ${nicheId}:`, (err as Error).message);
    return [];
  }
}
