import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LandscapeHintModal } from '@/components/game/LandscapeHintModal';
import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { WoodButton } from '@/components/ui/WoodButton';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { NPCS } from '@/constants/npcs';
import { changeLanguage } from '@/locales';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore, type AppLanguage } from '@/store/settingsStore';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { playBgm, syncBgmWithSettings } from '@/utils/bgmService';
import {
  fetchAdRemovalProduct,
  purchaseAdRemoval,
  purchasesRuntimeEnabled,
  restorePurchases,
} from '@/utils/purchaseService';

export default function MenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);
  const maxId = NPCS[NPCS.length - 1]!.id;
  const unlockedLabel = `${Math.min(highestUnlocked, maxId)} / ${maxId}`;

  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const language = useSettingsStore((s) => s.language);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setMusicEnabled = useSettingsStore((s) => s.setMusicEnabled);
  const setHapticEnabled = useSettingsStore((s) => s.setHapticEnabled);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setLandscapeHintSeen = useSettingsStore((s) => s.setLandscapeHintSeen);
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);

  const isAdFree = useProgressStore((s) => s.isAdFree);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [adRemovalPrice, setAdRemovalPrice] = useState<string | null>(null);
  const [productReady, setProductReady] = useState(false);
  const [productLoadTried, setProductLoadTried] = useState(false);
  const iapAvailable = purchasesRuntimeEnabled();

  useEffect(() => {
    const maybeShow = () => {
      if (!useSettingsStore.getState().landscapeHintSeen) {
        setShowLandscapeHint(true);
      }
    };
    if (useSettingsStore.persist.hasHydrated()) {
      maybeShow();
      return;
    }
    return useSettingsStore.persist.onFinishHydration(maybeShow);
  }, []);

  useEffect(() => {
    if (!iapAvailable || isAdFree) return;
    let cancelled = false;
    let attempt = 0;

    const load = async () => {
      const p = await fetchAdRemovalProduct();
      if (cancelled) return;
      if (p) {
        setAdRemovalPrice(p.localizedPrice || null);
        setProductReady(true);
        setProductLoadTried(true);
        return;
      }
      attempt += 1;
      setProductLoadTried(true);
      if (attempt < 6) {
        setTimeout(() => {
          if (!cancelled) void load();
        }, 1500);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [iapAvailable, isAdFree]);

  const dismissLandscapeHint = useCallback(() => {
    setShowLandscapeHint(false);
    setLandscapeHintSeen(true);
  }, [setLandscapeHintSeen]);

  const onLanguageChange = useCallback(
    (lang: AppLanguage) => {
      setLanguage(lang);
      changeLanguage(lang);
    },
    [setLanguage],
  );

  const onPurchaseAdRemoval = useCallback(async () => {
    if (isAdFree || purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      const result = await purchaseAdRemoval();
      if (result.ok) {
        if (!useProgressStore.getState().isAdFree) {
          Alert.alert(
            t('menu.iapPurchaseDoneTitle'),
            t('menu.iapPurchaseDoneBody'),
          );
        }
        return;
      }
      if (result.reason === 'cancelled') return;
      Alert.alert(t('menu.iapPurchaseFailTitle'), result.message);
    } finally {
      setPurchaseBusy(false);
    }
  }, [isAdFree, purchaseBusy, t]);

  const onRestorePurchases = useCallback(async () => {
    if (purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(
        restored ? t('menu.iapRestoreOkTitle') : t('menu.iapRestoreNoneTitle'),
        restored ? t('menu.iapRestoreOkBody') : t('menu.iapRestoreNoneBody'),
      );
    } finally {
      setPurchaseBusy(false);
    }
  }, [purchaseBusy, t]);

  useScreenBgm('menu');

  const onMusicToggle = useCallback(
    (value: boolean) => {
      setMusicEnabled(value);
      syncBgmWithSettings();
      if (value) playBgm('menu');
    },
    [setMusicEnabled],
  );

  return (
    <MetaScreenShell>
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.brand, { fontFamily: FONT_RYE }]}>HIGH NOON</Text>
          <Text style={styles.tagline}>{t('title.tagline')}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('menu.play')}</Text>
            <View style={styles.primaryButtons}>
              <WoodButton
                title={t('menu.vsNpc')}
                accessibilityHint={t('menu.vsNpcHint')}
                onPress={() => router.push('/npc-select')}
                style={styles.primaryBtn}
              />
              <WoodButton
                title={t('menu.localDuel')}
                accessibilityHint={t('menu.localDuelHint')}
                onPress={() => router.push('/local-setup')}
                style={styles.primaryBtn}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('menu.more')}</Text>
            <View style={styles.secondaryRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('menu.stats')}
                onPress={() => router.push('/stats')}
                style={({ pressed }) => [styles.secondaryTile, pressed && styles.secondaryTilePressed]}
              >
                <Text style={styles.secondaryTileText}>{t('menu.stats')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('menu.character')}
                onPress={() => router.push('/character-select')}
                style={({ pressed }) => [styles.secondaryTile, pressed && styles.secondaryTilePressed]}
              >
                <Text style={styles.secondaryTileText}>{t('menu.character')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>{t('menu.settings')}</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('menu.bgm')}</Text>
              <Switch
                accessibilityLabel={t('menu.bgm')}
                value={musicEnabled}
                onValueChange={onMusicToggle}
                trackColor={{ false: '#2A1810', true: 'rgba(212, 165, 116, 0.45)' }}
                thumbColor={musicEnabled ? colors.ochre : colors.sand}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('menu.sfx')}</Text>
              <Switch
                accessibilityLabel={t('menu.sfx')}
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#2A1810', true: 'rgba(212, 165, 116, 0.45)' }}
                thumbColor={soundEnabled ? colors.ochre : colors.sand}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('menu.vibration')}</Text>
              <Switch
                accessibilityLabel={t('menu.vibration')}
                value={hapticEnabled}
                onValueChange={setHapticEnabled}
                trackColor={{ false: '#2A1810', true: 'rgba(212, 165, 116, 0.45)' }}
                thumbColor={hapticEnabled ? colors.ochre : colors.sand}
              />
            </View>
            <LanguageSelector value={language} onChange={onLanguageChange} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerLabel}>{t('menu.progress')}</Text>
            <Text style={[styles.footerValue, { fontFamily: FONT_RYE }]}>
              {unlockedLabel}
            </Text>
          </View>

          {iapAvailable ? (
            <View style={styles.iapCard}>
              {isAdFree ? (
                <>
                  <Text style={styles.iapTitle}>{t('menu.iapActiveTitle')}</Text>
                  <Text style={styles.iapDesc}>{t('menu.iapThanks')}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.iapTitle}>{t('menu.iapTitle')}</Text>
                  <Text style={styles.iapDesc}>{t('menu.iapDesc')}</Text>
                  {productLoadTried && !productReady ? (
                    <Text style={styles.iapWarn}>{t('menu.iapWarn')}</Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('menu.iapBuyA11y')}
                    disabled={purchaseBusy}
                    onPress={onPurchaseAdRemoval}
                    style={({ pressed }) => [
                      styles.iapBuyBtn,
                      pressed && styles.iapBuyBtnPressed,
                      purchaseBusy && styles.iapBuyBtnDisabled,
                    ]}
                  >
                    <Text style={styles.iapBuyText}>
                      {purchaseBusy
                        ? t('menu.iapBuying')
                        : `${t('menu.iapBuy')}${adRemovalPrice ? ` · ${adRemovalPrice}` : ''}`}
                    </Text>
                  </Pressable>
                </>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('menu.iapRestoreA11y')}
                disabled={purchaseBusy}
                onPress={onRestorePurchases}
                style={styles.iapRestoreBtn}
              >
                <Text style={styles.iapRestoreText}>{t('menu.iapRestore')}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
      <LandscapeHintModal visible={showLandscapeHint} onDismiss={dismissLandscapeHint} />
    </MetaScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
    zIndex: 1,
  },
  brand: {
    fontSize: 28,
    color: colors.gold,
    letterSpacing: 3,
    ...metaTextShadow,
  },
  tagline: {
    marginTop: 6,
    color: colors.cream,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
    ...metaTextShadow,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: 1.4,
    marginLeft: 2,
    ...metaTextShadow,
  },
  primaryButtons: {
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryTile: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  secondaryTilePressed: {
    opacity: 0.85,
  },
  secondaryTileText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cream,
    ...metaTextShadow,
  },
  settingsCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    gap: 10,
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1.2,
    marginBottom: 2,
    ...metaTextShadow,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.cream,
    ...metaTextShadow,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  footerLabel: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    ...metaTextShadow,
  },
  footerValue: {
    marginTop: 4,
    fontSize: 22,
    color: colors.gold,
    letterSpacing: 1.5,
    ...metaTextShadow,
  },
  iapCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    gap: 10,
  },
  iapTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 1,
    ...metaTextShadow,
  },
  iapDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.cream,
    opacity: 0.9,
    ...metaTextShadow,
  },
  iapWarn: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.gold,
    opacity: 0.95,
    marginBottom: 4,
    ...metaTextShadow,
  },
  iapBuyBtn: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.rustRed,
    borderWidth: 1,
    borderColor: 'rgba(245, 230, 200, 0.4)',
    alignItems: 'center',
  },
  iapBuyBtnPressed: {
    opacity: 0.85,
  },
  iapBuyBtnDisabled: {
    opacity: 0.6,
  },
  iapBuyText: {
    color: colors.cream,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  iapRestoreBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  iapRestoreText: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
    textDecorationLine: 'underline',
  },
});
