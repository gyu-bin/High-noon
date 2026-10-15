import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { play } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';

const leather = require('@/high_noon_terra_asset_pack/output/ui/textures/leather_panel.png');
const wood = require('@/assets/images/ui/western/ui_wood_texture.png');

export function WesternPanel({ children, style, variant = 'leather' }: { children: ReactNode; style?: StyleProp<ViewStyle>; variant?: 'leather' | 'plain' }) {
  return (
    <View style={[styles.panel, style]}>
      {variant === 'leather' ? <Image source={leather} contentFit="cover" style={styles.panelTexture} /> : null}
      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

export function WesternHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const cjkTitle = usesCjkFont(title);
  return (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, cjkTitle && styles.cjkHeaderTitle]}>{title}</Text>
      {subtitle ? <Text style={[styles.headerSubtitle, usesCjkFont(subtitle) && styles.cjkSubtitle]}>{subtitle}</Text> : null}
      <View style={styles.divider}><View style={styles.dividerLine} /><View style={styles.dividerDiamond} /><View style={styles.dividerLine} /></View>
    </View>
  );
}

export function WesternButton({
  title,
  subtitle,
  leadingIcon,
  onPress,
  disabled = false,
  variant = 'secondary',
  style,
  accessibilityHint,
}: {
  title: string;
  subtitle?: string;
  leadingIcon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const cjkTitle = usesCjkFont(title);
  const press = () => {
    if (disabled) return;
    void play('ready_click');
    void trigger('selection');
    onPress();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={press}
      style={({ pressed }) => [styles.button, variant === 'primary' ? styles.button_primary : variant === 'quiet' ? styles.button_quiet : styles.button_secondary, disabled && styles.buttonDisabled, pressed && !disabled && styles.buttonPressed, style]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={variant === 'primary' ? ['#E2BD84', '#BB874A', '#956334'] : ['#392419', '#1C110D', '#100B08']}
        style={StyleSheet.absoluteFill}
      />
      <Image source={wood} contentFit="cover" style={styles.buttonTexture} />
      <View pointerEvents="none" style={styles.buttonInset} />
      <View style={styles.buttonContent}>
        {leadingIcon ? <View style={styles.buttonIcon}>{leadingIcon}</View> : null}
        <View style={styles.buttonCopy}>
          <Text style={[styles.buttonTitle, cjkTitle && styles.cjkButtonTitle, variant === 'primary' && styles.buttonTitlePrimary]}>{title}</Text>
          {subtitle ? <Text style={[styles.buttonSubtitle, usesCjkFont(subtitle) && styles.cjkSubtitle]}>{subtitle}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function WesternSettingRow({ label, children, description }: { label: string; children: ReactNode; description?: string }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { overflow: 'hidden', borderRadius: 4, borderWidth: 1, borderColor: '#695038', backgroundColor: '#17100D' },
  panelTexture: { ...StyleSheet.absoluteFillObject, opacity: 0.13 },
  panelContent: { padding: 16 },
  header: { alignItems: 'center', gap: 5 },
  headerTitle: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 27, textAlign: 'center', letterSpacing: 1.2, textShadowColor: uiV3Colors.background, textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 2 },
  cjkHeaderTitle: { fontFamily: FONT_WESTERN_SERIF, fontSize: 25, fontWeight: '700', letterSpacing: 2.2 },
  headerSubtitle: { color: uiV3Colors.ochre, fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  cjkSubtitle: { fontFamily: FONT_WESTERN_SERIF, fontWeight: '700', letterSpacing: 1.2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '62%', marginTop: 3 },
  dividerLine: { flex: 1, height: 1, backgroundColor: uiV3Colors.ochre, opacity: 0.75 },
  dividerDiamond: { width: 6, height: 6, backgroundColor: uiV3Colors.gold, transform: [{ rotate: '45deg' }] },
  button: { minHeight: 52, overflow: 'hidden', justifyContent: 'center', borderWidth: 1, borderRadius: 4, borderColor: '#A17C4F', backgroundColor: uiV3Colors.darkBrown, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 3, elevation: 3 },
  buttonInset: { position: 'absolute', top: 3, bottom: 3, left: 3, right: 3, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(242,213,162,0.2)' },
  button_primary: { backgroundColor: '#C29256', borderColor: '#F0CE96', borderRadius: 3 },
  button_secondary: {},
  button_quiet: { minHeight: 42, backgroundColor: uiV3Colors.background, borderColor: uiV3Colors.dustGray },
  buttonDisabled: { opacity: 0.42 },
  buttonPressed: { transform: [{ translateY: 2 }], shadowOpacity: 0.1 },
  buttonTexture: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  buttonIcon: { width: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  buttonCopy: { flexShrink: 1, alignItems: 'center', justifyContent: 'center' },
  buttonTitle: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 17, textAlign: 'center' },
  cjkButtonTitle: { fontFamily: FONT_WESTERN_SERIF, fontSize: 16, fontWeight: '700', letterSpacing: 1.1, textShadowColor: 'rgba(0,0,0,0.48)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  buttonTitlePrimary: { color: '#211208' },
  buttonSubtitle: { color: uiV3Colors.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginTop: 1, textAlign: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 52, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiV3Colors.dustGray },
  settingCopy: { flex: 1 },
  settingLabel: { color: uiV3Colors.cream, fontFamily: FONT_WESTERN_SERIF, fontSize: 15, fontWeight: '700', letterSpacing: 0.45, textShadowColor: '#090402', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  settingDescription: { color: uiV3Colors.dustGray, fontFamily: FONT_WESTERN_SERIF, fontSize: 11, lineHeight: 17, letterSpacing: 0.15, marginTop: 4 },
});
