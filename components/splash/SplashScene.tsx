import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { FONT_RYE } from '@/constants/fonts';

export const SPLASH_ART = require('@/assets/branding/cinematic-hero.png');
export function SplashScene({ children }: { children?: React.ReactNode }) {
  return <View style={styles.scene}><Image source={SPLASH_ART} contentFit="cover" contentPosition="center" transition={0} style={StyleSheet.absoluteFill} />{children}</View>;
}
export function SplashBrand() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  return <View pointerEvents="none" style={[styles.brand, landscape && styles.brandLandscape]}>
    <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.title, { fontSize: Math.min(width * 0.13, landscape ? 56 : 62) }]}>HIGH NOON</Text>
    <Text style={styles.subtitle}>A DUEL AWAITS</Text>
    <View style={styles.rule} />
    <Text style={styles.motto}>SAME SUN.{ '\n' }DIFFERENT FATES.</Text>
  </View>;
}
const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: '#1A0C06' },
  brand: { position: 'absolute', top: '63%', left: 20, right: 20, alignItems: 'center' },
  brandLandscape: { top: '49%', left: '51%', right: 24 },
  title: { color: '#F3D1A0', fontFamily: FONT_RYE, letterSpacing: 1, textAlign: 'center', textShadowColor: '#190B05', textShadowOffset: { width: 1, height: 3 }, textShadowRadius: 3 },
  subtitle: { color: '#EDC68D', fontSize: 11, letterSpacing: 4, marginTop: 7, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  rule: { width: 62, height: 1, backgroundColor: '#AF7F44', marginTop: 24, marginBottom: 16 },
  motto: { color: '#D9BA8F', fontSize: 9, lineHeight: 16, letterSpacing: 3, textAlign: 'center', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});
