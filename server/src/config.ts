import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  gnewsApiKey: process.env.GNEWS_API_KEY ?? '',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? '',
};

/** Which integrations are actually wired up right now. Surfaced at /api/health. */
export const capabilities = {
  googleAuth: Boolean(config.googleClientId),
  liveNews: Boolean(config.gnewsApiKey),
  neuralTts: Boolean(config.elevenLabsApiKey),
};
