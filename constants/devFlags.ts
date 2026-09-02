/** 테스트용 — 배포 전 false 로 되돌리기 */
export const DEV_AUTO_SCREENSHOTS =
  process.env.EXPO_PUBLIC_AUTO_SCREENSHOTS === '1';
/** Expo 개발 서버·dev 빌드에서만 전체 해금. 프로덕션 빌드에서는 자동으로 false */
export const DEV_UNLOCK_ALL_NPCS = __DEV__;
export const DEV_UNLOCK_ALL_CHARACTERS = __DEV__;

/**
 * preview 변형 빌드 여부 (`app.config.js`에서 번들 ID를 분리한 빌드).
 *
 * 번들 ID가 AdMob 콘솔에 등록된 것과 달라 실광고가 서빙되지 않는다. 그리고 자기
 * 광고를 직접 누르는 건 정책 위반이라, preview에서는 테스트 광고를 쓴다.
 */
export const IS_PREVIEW_BUILD = process.env.EXPO_PUBLIC_APP_VARIANT === 'preview';
