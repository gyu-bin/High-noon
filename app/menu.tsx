import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { WesternButton } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE } from '@/constants/fonts';
import { NPCS } from '@/constants/npcs';
import { uiV3Colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { useProgressStore } from '@/store/progressStore';
import { preloadInterstitial } from '@/utils/adService';
import { play } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';

type MenuShortcutProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function MenuShortcut({ icon, label, onPress }: MenuShortcutProps) {
  const press = () => {
    void play('ready_click');
    void trigger('selection');
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={press}
      style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
    >
      <View style={styles.shortcutIcon}>
        <Ionicons name={icon} size={23} color={uiV3Colors.cream} />
      </View>
      <Text numberOfLines={1} style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

export default function MenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);
  const maxId = NPCS[NPCS.length - 1]!.id;

  useScreenBgm('menu');
  useFocusEffect(useCallback(() => { preloadInterstitial(); }, []));


  return (
    <MetaScreenShell background={require('@/assets/branding/cinematic-hero.png')}>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom, 14) },
          landscape && styles.rootLandscape,
        ]}
      >
        <View style={[styles.brand, landscape && styles.brandLandscape]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.logo}>HIGH NOON</Text>
          <View style={styles.brandRule} />
          <Text style={styles.tagline}>{t('meta.menu.tagline')}</Text>
          <Text style={styles.progress}>{t('menu.progress')} · {Math.min(highestUnlocked, maxId)} / {maxId}</Text>
        </View>

        <View style={[styles.controls, landscape && styles.controlsLandscape]}>
          <View style={styles.primaryActions}>
            <WesternButton
              title={t('menu.vsNpc')}
              subtitle={t('meta.menu.solo')}
              leadingIcon={<Ionicons name="flash-outline" size={27} color={uiV3Colors.gold} />}
              variant="primary"
              accessibilityHint={t('menu.vsNpcHint')}
              onPress={() => router.push('/npc-select')}
            />
            <WesternButton
              title={t('menu.localDuel')}
              subtitle={t('meta.menu.local')}
              leadingIcon={<Ionicons name="people-outline" size={27} color={uiV3Colors.cream} />}
              accessibilityHint={t('menu.localDuelHint')}
              onPress={() => router.push('/local-setup')}
            />
          </View>

          <View style={styles.shortcutBar}>
            <MenuShortcut icon="person-circle-outline" label={t('menu.character')} onPress={() => router.push('/character-select')} />
            <View style={styles.shortcutDivider} />
            <MenuShortcut icon="stats-chart-outline" label={t('menu.stats')} onPress={() => router.push('/stats')} />
            <View style={styles.shortcutDivider} />
            <MenuShortcut icon="settings-outline" label={t('menu.settings')} onPress={() => router.push('/settings' as never)} />
          </View>
        </View>
      </View>
    </MetaScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22, justifyContent: 'space-between' },
  rootLandscape: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 52, gap: 56 },
  brand: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', paddingTop: 18 },
  brandLandscape: { alignItems: 'flex-start', minHeight: 0 },
  logo: {
    color: uiV3Colors.cream,
    fontFamily: FONT_RYE,
    fontSize: 45,
    letterSpacing: 2.2,
    textAlign: 'center',
    textShadowColor: '#140704',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 3,
  },
  brandRule: { width: 112, height: 1, backgroundColor: uiV3Colors.ochre, marginTop: 12, marginBottom: 10 },
  tagline: { color: uiV3Colors.gold, fontSize: 12, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  progress: { marginTop: 15, color: uiV3Colors.cream, fontSize: 11, fontWeight: '700', letterSpacing: 0.7, opacity: 0.84 },
  controls: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16 },
  controlsLandscape: { flex: 1, maxWidth: 500 },
  primaryActions: { gap: 10 },
  shortcutBar: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 7,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.48)',
    backgroundColor: 'rgba(26, 12, 6, 0.82)',
  },
  shortcut: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  shortcutPressed: { opacity: 0.68, transform: [{ translateY: 1 }] },
  shortcutIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 230, 200, 0.42)',
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  shortcutLabel: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 10, letterSpacing: 0.3 },
  shortcutDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(245, 230, 200, 0.24)', marginVertical: 4 },
});
