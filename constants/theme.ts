/**
 * High Noon — 서부 시대 UI 팔레트
 */

export const colors = {
  /** 황토 — 메인 액센트 */
  ochre: '#C8860A',
  /** 다크 브라운 — 배경/텍스트 베이스 */
  darkBrown: '#2C1A0E',
  /** 크림 — 카드/본문 배경 */
  cream: '#F5E6C8',
  /** 레드 — BANG / 위험 / 패배 강조 */
  rustRed: '#8B1A1A',
  /** 모래 — 보조 표면/보더 */
  sand: '#D4AA70',
} as const;

export const theme = {
  colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 20,
  },
} as const;

export type ThemeColorKey = keyof typeof colors;
