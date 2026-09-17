import { PrismaClient } from '@prisma/client';
import { estimateSeconds } from '../src/domain';

const prisma = new PrismaClient();

/**
 * Seed pool. Keeps the app fully demoable without a news API key, and gives
 * live GNews results something to blend with on day one.
 * The first three mirror the stories shown in the Figma brief screen.
 */
const STORIES = [
  ['ai-tech', 'THE VERGE', 'Anthropic ships Claude 4.5 with 2M-token memory and native tools.', "Anthropic's new memory layer lets Claude hold entire codebases in mind while it works, removing the retrieval step that slowed longer engineering sessions."],
  ['global', 'BLOOMBERG', 'Fed minutes hint at a September policy shift.', 'Officials flagged growing confidence that inflation is cooling toward target, opening the door to the first rate cut of the cycle.'],
  ['startups', 'ECONOMIC TIMES', 'Adani Energy raises $1.2B in follow-on offering.', 'The green energy arm priced its share sale at a modest discount, drawing sovereign funds and domestic institutions into the book.'],
  ['ai-tech', 'REUTERS', 'OpenAI unveils on-device model rivaling GPT-4 class reasoning.', 'The compressed model runs offline on flagship phones, shifting a slice of inference cost away from data centres and onto handsets.'],
  ['ai-tech', 'TECHCRUNCH', 'Nvidia opens Bengaluru research centre focused on edge inference.', 'The lab will target low-power inference for Indian language models, and plans to hire 400 engineers over eighteen months.'],
  ['markets', 'MINT', 'Sensex closes at record high as IT stocks rally.', 'A softer dollar and stronger-than-expected US tech earnings lifted Indian IT majors, with the index adding 1.4 percent through the session.'],
  ['markets', 'CNBC', 'Rupee steadies after RBI intervention in forward markets.', 'The central bank sold dollars through state-run banks, arresting a slide that had taken the currency to a two-month low.'],
  ['markets', 'FINANCIAL TIMES', 'Gold holds near record as central banks keep buying.', 'Reserve diversification away from the dollar continues to underpin bullion, with emerging-market central banks the dominant buyers.'],
  ['indian-biz', 'BUSINESS STANDARD', 'Reliance splits retail arm ahead of expected listing.', 'The restructuring separates grocery and fashion into distinct entities, a move bankers read as preparation for a 2027 public offering.'],
  ['indian-biz', 'ECONOMIC TIMES', 'GST council moves to simplify rates into three slabs.', 'The proposal would collapse the current structure, easing compliance for small businesses while keeping headline revenue broadly neutral.'],
  ['startups', 'YOURSTORY', 'Zepto crosses $2B annualised run rate as quick commerce consolidates.', 'The company says contribution margins turned positive in its top eight cities, a first for the category in India.'],
  ['startups', 'TECHCRUNCH', 'Y Combinator winter batch skews heavily toward AI agents.', 'More than sixty percent of the cohort is building agentic tooling, the highest concentration around a single theme in the accelerator history.'],
  ['global', 'AP', 'EU agrees framework for critical minerals partnership with India.', 'The pact covers rare earth processing and battery supply chains, and is framed by both sides as a hedge against concentration risk.'],
  ['global', 'GUARDIAN', 'UN climate finance talks stall over adaptation funding.', 'Developing nations pushed for binding commitments while major emitters resisted, leaving the headline figure unresolved into the final session.'],
  ['science', 'NATURE', 'Room-temperature superconductor claim fails independent replication.', 'Three laboratories reported no evidence of zero resistance, and the original authors have now requested their preprint be withdrawn.'],
  ['science', 'SCIENCE', 'JWST spots water vapour in a rocky exoplanet atmosphere.', 'The detection is the strongest yet for a planet in the habitable zone, though researchers caution the signal needs a second observing window.'],
  ['health', 'BBC', 'Trial shows weekly insulin matches daily dosing in type 2 diabetes.', 'The phase three result could sharply reduce injection burden, with regulators expected to review the filing early next year.'],
  ['climate', 'REUTERS', 'India crosses 50 percent non-fossil installed capacity ahead of target.', 'Solar additions drove the milestone, reached five years earlier than the commitment made under the Paris framework.'],
  ['geopolitics', 'AL JAZEERA', 'Red Sea shipping volumes recover to pre-disruption levels.', 'Carriers have resumed Suez transits after a sustained lull in attacks, trimming the freight premium that had squeezed importers.'],
  ['legal', 'LIVELAW', 'Supreme Court sets limits on warrantless device seizures.', 'The bench held that investigators must obtain judicial authorisation before cloning personal devices, citing privacy precedent.'],
  ['culture', 'VARIETY', 'Indian animation studio lands multi-film deal with a global streamer.', 'The agreement covers three original features, and is the largest commitment yet to a domestic animation house.'],
  ['sports', 'ESPN', 'India names uncapped spinner for the away Test series.', 'Selectors backed form over experience, handing a first call-up to the leading wicket-taker in this season domestic competition.'],
] as const;

/**
 * Seeded stories are deliberately backdated several days. Live headlines from
 * RSS/GNews are always newer, so they win the "most recent" ordering and the
 * seed pool only surfaces when a fetch returns nothing.
 */
const SEED_AGE_MS = 4 * 24 * 60 * 60 * 1000;

async function main() {
  const now = Date.now() - SEED_AGE_MS;

  for (const [i, [category, source, title, summary]] of STORIES.entries()) {
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
  }

  const count = await prisma.story.count();
  console.log(`seeded - ${STORIES.length} stories written, ${count} total in database`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
