import { StyleSheet, View, type ViewProps, type ImageSourcePropType } from 'react-native';

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { WESTERN_HERO_FALLBACK } from '@/constants/westernBackground';
import { useSettingsStore } from '@/store/settingsStore';

type Props = ViewProps & {
  children: React.ReactNode;
  showDust?: boolean;
  background?: ImageSourcePropType;
  ambience?: 'default' | 'poster';
};

/** 메타 화면 — 타이틀과 동일 배경, 좌우 레터박스 없이 전체 너비 */
export function MetaScreenShell({
  children,
  style,
  ambience = 'default',
  showDust: _showDust = true,
  background = require('@/high_noon_terra_asset_pack/output/backgrounds/duel_town_sunset.png'),
  ...rest
}: Props) {
  const darkMode = useSettingsStore((s) => s.darkMode);
  return (
    <View style={[styles.outer, style]} {...rest}>
      <Image source={background} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={ambience === 'poster' ? ['rgba(12,8,5,0.35)', 'rgba(20,10,5,0.16)', 'rgba(9,6,4,0.60)'] : ['rgba(12,8,5,0.68)', 'rgba(20,10,5,0.26)', 'rgba(9,6,4,0.92)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
        {darkMode ? <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: ambience === 'poster' ? 'rgba(8,5,3,0.12)' : 'rgba(8, 5, 3, 0.52)' }]} /> : null}
        {children}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: WESTERN_HERO_FALLBACK,
  },
  fill: {
    flex: 1,
    width: '100%',
  },
});
