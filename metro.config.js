/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
    // Expo 기본값은 inlineRequires: false — worklets/reanimated 초기화 순서 깨짐 방지
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,
      },
    }),
  };
  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
    resolveRequest: (context, moduleName, platform) => {
      // AdMob은 네이티브 전용 — web/static export 시 stub로 치환 (OTA --platform all 대비)
      if (
        platform === 'web' &&
        (moduleName === 'react-native-google-mobile-ads' ||
          moduleName.startsWith('react-native-google-mobile-ads/'))
      ) {
        return {
          type: 'sourceFile',
          filePath: require.resolve('./utils/adMobWebStub.js'),
        };
      }
      if (typeof resolver.resolveRequest === 'function') {
        return resolver.resolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  return config;
})();
