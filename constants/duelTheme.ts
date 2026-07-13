/**
 * 결투 화면 비주얼 테마.
 * 'minimal' — 웜 화이트 배경 + 먹색 타이포 + 지면선 (서부 배경 이미지 제거).
 * 'western' — 기존 낮/밤/노을 배경 이미지. 되돌리려면 이 값만 바꾸면 된다.
 */
export const DUEL_VISUAL_THEME: 'minimal' | 'western' = 'western';

export const MINIMAL_DUEL = {
  /** 종이 느낌 웜 화이트 */
  bg: '#F4F2ED',
  /** 스테이지 밖 레터박스 */
  stageEdge: '#E7E4DC',
  /** 먹색 — 제목/강조 타이포 */
  ink: '#1C1A15',
  inkSoft: 'rgba(28, 26, 21, 0.62)',
  inkFaint: 'rgba(28, 26, 21, 0.34)',
  /** 캐릭터 발밑 지면선 */
  line: 'rgba(28, 26, 21, 0.22)',
  heartEmpty: 'rgba(28, 26, 21, 0.2)',
  /** BANG — 화이트 위 유일한 강한 컬러 포인트 */
  bang: '#D62828',
  /** 탭 피드백 플래시 */
  flash: 'rgba(28, 26, 21, 0.12)',
} as const;
