import { META_PANEL_BG, META_PANEL_BORDER } from '@/constants/westernBackground';

/** 승리·패배 화면 공통 패널 */
export const OUTCOME_PANEL = {
  background: META_PANEL_BG,
  border: META_PANEL_BORDER,
  borderRadius: 16,
} as const;

export const OUTCOME_VICTORY = {
  title: '#F5D76E',
  accent: '#E8A82A',
  glow: 'rgba(255, 196, 80, 0.28)',
  overlay: ['transparent', 'transparent', 'transparent'] as const,
  overlayLocations: [0, 0.42, 1] as const,
  badgeBg: 'rgba(48, 28, 8, 0.92)',
  badgeBorder: 'rgba(232, 168, 42, 0.65)',
} as const;

export const OUTCOME_DEFEAT = {
  title: '#C97A7A',
  accent: '#8B2020',
  glow: 'rgba(120, 24, 24, 0.35)',
  overlay: ['transparent', 'transparent', 'transparent'] as const,
  overlayLocations: [0, 0.38, 1] as const,
  badgeBg: 'rgba(32, 10, 10, 0.94)',
  badgeBorder: 'rgba(180, 72, 72, 0.55)',
} as const;

export const outcomeTextShadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.92)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 8,
} as const;
