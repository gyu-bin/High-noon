/**
 * preview 변형 설정.
 *
 * `app.json`을 지우지 않고 그 위에 덧씌운다. `scripts/sync-store-version.js`와
 * `scripts/bump-store-version.js`가 `app.json`을 직접 읽고 쓰기 때문에, 동적 설정으로
 * 통째로 옮기면 그 스크립트들이 깨진다. Expo는 두 파일이 함께 있으면 `app.json`을
 * 읽어 이 함수의 `config`로 넘겨준다.
 *
 * preview 빌드는 번들 ID를 분리해 **출시된 앱과 한 기기에 같이 설치**할 수 있게 한다.
 * 그래야 실제 진행도가 든 출시 앱을 지우지 않고 테스트할 수 있다.
 *
 *   eas build --profile preview      (eas.json에서 EXPO_PUBLIC_APP_VARIANT=preview 주입)
 *   npm run update:preview           (그 빌드에만 OTA 전달)
 *
 * 주의: 번들 ID가 다르면 AdMob 콘솔에 등록된 앱이 아니라 실광고가 안 나온다.
 * 그래서 preview에서는 테스트 광고를 쓴다 (`constants/devFlags.ts`의 IS_PREVIEW_BUILD).
 * 인앱결제 상품도 번들 ID에 묶여 있어 preview에서는 조회되지 않는다.
 */
const IS_PREVIEW = process.env.EXPO_PUBLIC_APP_VARIANT === 'preview';

module.exports = ({ config }) => {
  if (!IS_PREVIEW) return config;

  return {
    ...config,
    // 홈 화면에서 출시 앱과 구분되도록
    name: `${config.name} Preview`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios.bundleIdentifier}.preview`,
    },
    android: {
      ...config.android,
      package: `${config.android.package}.preview`,
    },
  };
};
