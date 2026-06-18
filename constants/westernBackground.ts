/** 타이틀·메뉴 등 공통 웨스턴 배경 */
export const WESTERN_HERO_FALLBACK = '#1A0C06';

/** 전체 비네팅 — 상단은 하늘 살리고 하단 UI는 어둡게 */
export const WESTERN_HERO_GRADIENT = {
  colors: [
    'rgba(10, 5, 2, 0.38)',
    'rgba(8, 4, 2, 0.06)',
    'rgba(8, 4, 2, 0.22)',
    'rgba(6, 3, 1, 0.82)',
  ] as const,
  locations: [0, 0.32, 0.58, 1] as const,
};

/** 중앙 태양 주변 부드러운 글로우 */
export const WESTERN_SUN_GLOW = {
  colors: [
    'rgba(255, 180, 60, 0.12)',
    'rgba(255, 140, 40, 0.04)',
    'transparent',
  ] as const,
  locations: [0, 0.45, 1] as const,
};

/** 메타 UI 패널·텍스트 */
export const META_PANEL_BG = 'rgba(10, 6, 3, 0.9)';
export const META_PANEL_BORDER = 'rgba(212, 165, 112, 0.42)';

export const metaTextShadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.9)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;
