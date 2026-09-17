/**
 * Design tokens lifted from the Nuzio Figma ("Create Nuzio AI Screens").
 * Single source of truth so every screen stays on-system.
 */
export const colors = {
  ink: '#0D0D0D',           // page background
  inkRaised: '#0F0F0F',
  surface: 'rgba(255,255,255,0.05)',
  surfaceStrong: 'rgba(255,255,255,0.07)',
  surfaceActive: 'rgba(255,255,255,0.12)',
  hairline: 'rgba(255,255,255,0.09)',
  hairlineStrong: 'rgba(255,255,255,0.12)',

  violet: '#6A4CF7',
  violetLight: '#9080FF',
  cyan: '#38D9F0',
  green: '#3ECF8E',

  text: '#F0EDE8',
  textDim: 'rgba(245,241,234,0.72)',
  textMuted: '#8A8480',
  textFaint: 'rgba(255,255,255,0.22)',
  onViolet: '#FFFFFF',
} as const;

export const fonts = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansBold: 'HankenGrotesk_700Bold',
  mono: 'GeistMono_400Regular',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 24,
  pill: 100,
} as const;

export const spacing = (n: number) => n * 4;

/** Monospaced micro-labels ("STEP 1 OF 6", "NOW PLAYING") */
export const label = {
  fontFamily: fonts.mono,
  fontSize: 10,
  letterSpacing: 1.4,
  color: colors.textMuted,
  textTransform: 'uppercase' as const,
};

export const formatClock = (totalSeconds: number): string => {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

export const formatDuration = (totalSeconds: number): string => {
  const m = Math.round(totalSeconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
};
