/**
 * High Noon — 서부 시대 UI 팔레트
 */

export const colors = {
  /** 황토 — 메인 액센트 */
  ochre: '#D4A017',
  /** 하이라이트 골드 */
  gold: '#E8C547',
  /** 다크 브라운 — 헤더·카드·결투 */
  darkBrown: '#2C1A0E',
  /** 크림 — 본문 */
  cream: '#F0E6D2',
  /** 모래 — 보조 텍스트·보더 */
  sand: '#D4AA70',
  /** 레드 — 위험·패배 */
  rustRed: '#DC2626',
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
