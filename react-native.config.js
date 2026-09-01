/**
 * Android 1.4 내부테스트 콜드스타트 크래시 핫픽스.
 * react-native-iap 15 + nitro가 앱 기동 시 네이티브에서 죽을 수 있어
 * Android에서는 링크하지 않는다. iOS는 그대로 IAP 사용.
 *
 * Android 광고 제거 IAP를 다시 켤 때: 아래 블록 제거 후 네이티브 재빌드.
 */
module.exports = {
  dependencies: {
    'react-native-iap': {
      platforms: {
        android: null,
      },
    },
    'react-native-nitro-modules': {
      platforms: {
        android: null,
      },
    },
  },
};
