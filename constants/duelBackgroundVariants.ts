import { gameImages } from '@/constants/gameImages';

export type DuelBackgroundVariant = 'day' | 'night';

export const DUEL_BG_VARIANT = {
  day: {
    top: gameImages.duelBgDayFull,
    bottom: gameImages.duelBgDayFull,
    topDim: 'rgba(40, 22, 8, 0.06)',
    bottomDim: 'rgba(40, 22, 8, 0.1)',
    fullDim: 'rgba(30, 16, 4, 0.22)',
    vignette: [
      'rgba(30, 16, 4, 0.32)',
      'rgba(20, 10, 2, 0.05)',
      'rgba(20, 10, 2, 0.08)',
      'rgba(30, 16, 4, 0.36)',
    ] as const,
    splitHorizon: ['transparent', 'rgba(255, 200, 120, 0.34)', 'transparent'] as const,
    fullHorizon: ['transparent', 'rgba(255, 200, 120, 0.14)', 'transparent'] as const,
    topContentPosition: 'top' as const,
    bottomContentPosition: 'bottom' as const,
  },
  night: {
    top: gameImages.duelBgNightFull,
    bottom: gameImages.duelBgNightFull,
    topDim: 'rgba(8, 6, 24, 0.18)',
    bottomDim: 'rgba(8, 6, 24, 0.24)',
    fullDim: 'rgba(8, 6, 24, 0.3)',
    vignette: [
      'rgba(8, 6, 28, 0.44)',
      'rgba(8, 6, 28, 0.06)',
      'rgba(8, 6, 28, 0.1)',
      'rgba(6, 4, 20, 0.42)',
    ] as const,
    splitHorizon: ['transparent', 'rgba(120, 140, 220, 0.26)', 'transparent'] as const,
    fullHorizon: ['transparent', 'rgba(120, 140, 220, 0.1)', 'transparent'] as const,
    topContentPosition: 'top' as const,
    bottomContentPosition: 'bottom' as const,
  },
} as const;
