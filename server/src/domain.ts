/** Niches - screen 04 "What moves your world?" */
export const NICHES = [
  { id: 'ai-tech',    label: 'AI & Technology',   emoji: '\u{1F916}', query: 'artificial intelligence OR AI OR technology' },
  { id: 'markets',    label: 'Financial Markets', emoji: '\u{1F4CA}', query: 'stock market OR sensex OR nifty OR markets' },
  { id: 'indian-biz', label: 'Indian Business',   emoji: '\u{1F1EE}\u{1F1F3}', query: 'Indian business OR India economy' },
  { id: 'global',     label: 'Global Politics',   emoji: '\u{1F30D}', query: 'global politics OR world leaders' },
  { id: 'startups',   label: 'Startups',          emoji: '\u{1F680}', query: 'startup funding OR venture capital' },
  { id: 'science',    label: 'Science',           emoji: '\u{1F52C}', query: 'science research discovery' },
  { id: 'geopolitics',label: 'Geopolitics',       emoji: '\u{1F5FA}', query: 'geopolitics OR diplomacy' },
  { id: 'health',     label: 'Health & Medicine', emoji: '\u{1F48A}', query: 'health OR medicine OR healthcare' },
  { id: 'climate',    label: 'Climate & Energy',  emoji: '\u{1F331}', query: 'climate OR renewable energy' },
  { id: 'sports',     label: 'Sports',            emoji: '⚽',    query: 'sports cricket football' },
  { id: 'culture',    label: 'Culture & Arts',    emoji: '\u{1F3A8}', query: 'culture arts cinema' },
  { id: 'legal',      label: 'Legal & Policy',    emoji: '⚖',    query: 'law OR policy OR regulation' },
] as const;

export type NicheId = (typeof NICHES)[number]['id'];

export const nicheById = (id: string) => NICHES.find((n) => n.id === id);

/** Professions - screen 03 */
export const PROFESSIONS = [
  { id: 'finance',    label: 'Finance & Trading',  emoji: '\u{1F4C8}', niches: ['markets', 'indian-biz', 'global'] },
  { id: 'legal',      label: 'Legal',              emoji: '⚖',    niches: ['legal', 'global', 'indian-biz'] },
  { id: 'technology', label: 'Technology',         emoji: '\u{1F4BB}', niches: ['ai-tech', 'startups', 'science'] },
  { id: 'healthcare', label: 'Healthcare',         emoji: '\u{1FA7A}', niches: ['health', 'science', 'ai-tech'] },
  { id: 'consulting', label: 'Consulting',         emoji: '\u{1F4BC}', niches: ['indian-biz', 'markets', 'global'] },
  { id: 'marketing',  label: 'Marketing & Media',  emoji: '\u{1F4E3}', niches: ['culture', 'ai-tech', 'startups'] },
  { id: 'government', label: 'Government & Policy',emoji: '\u{1F3DB}', niches: ['legal', 'geopolitics', 'global'] },
  { id: 'realestate', label: 'Real Estate',        emoji: '\u{1F3E2}', niches: ['indian-biz', 'markets', 'climate'] },
  { id: 'education',  label: 'Education',          emoji: '\u{1F393}', niches: ['science', 'culture', 'ai-tech'] },
  { id: 'founder',    label: 'Founder / Builder',  emoji: '\u{1F680}', niches: ['startups', 'ai-tech', 'markets'] },
] as const;

/** Voices - screen 05 "Pick a narrator voice". */
export const VOICES = [
  { id: 'aria',  name: 'Aria',  initial: 'A', lang: 'en', langLabel: 'English', descriptor: 'Warm · Unhurried · British, ♀', elevenLabsId: '9BWtsMINqrJLrRacOk9x', speechLocale: 'en-GB', pitch: 1.0,  rate: 0.95 },
  { id: 'kai',   name: 'Kai',   initial: 'K', lang: 'en', langLabel: 'English', descriptor: 'Crisp · Focused · American, ♂',  elevenLabsId: 'TX3LPaxmHKxFdv7VOQHJ', speechLocale: 'en-US', pitch: 0.9,  rate: 1.0  },
  { id: 'meera', name: 'Meera', initial: 'M', lang: 'hi', langLabel: 'Hindi',   descriptor: 'Bright · Curious · Indian, ♀',   elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku', speechLocale: 'en-IN', pitch: 1.1,  rate: 0.97 },
] as const;

export const voiceById = (id: string) => VOICES.find((v) => v.id === id) ?? VOICES[0];

export const csvToList = (csv: string): string[] =>
  csv.split(',').map((s) => s.trim()).filter(Boolean);

/** ~150 spoken words per minute is a realistic narration pace. */
export const estimateSeconds = (text: string): number =>
  Math.max(45, Math.round((text.split(/\s+/).length / 150) * 60));
