/** 웹 번들용 AdMob stub — 네이티브 전용 모듈이 web export에서 깨지지 않게 */
module.exports = {
  AdsConsent: {},
  AdsConsentStatus: {},
  AdsConsentDebugGeography: {},
  BannerAd: () => null,
  BannerAdSize: {},
  InterstitialAd: { createForAdRequest: () => ({ load: () => {}, addAdEventListener: () => () => {}, show: () => {} }) },
  RewardedAd: { createForAdRequest: () => ({ load: () => {}, addAdEventListener: () => () => {}, show: () => {} }) },
  TestIds: { INTERSTITIAL: '', REWARDED: '', BANNER: '' },
  MaxAdContentRating: {},
  mobileAds: () => ({ initialize: async () => {} }),
};
