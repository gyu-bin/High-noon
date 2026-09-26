import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { WesternToggle } from '@/components/settings/WesternToggle';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WesternButton, WesternHeader, WesternPanel, WesternSettingRow } from '@/components/ui/western/WesternPrimitives';
import { FONT_WESTERN_SERIF } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { changeLanguage } from '@/locales';
import { useProgressStore } from '@/store/progressStore';
import { useMatchHistoryStore } from '@/store/matchHistoryStore';
import { useSettingsStore, type AppLanguage } from '@/store/settingsStore';
import { playBgm, syncBgmWithSettings } from '@/utils/bgmService';
import { fetchAdRemovalProduct, initPurchases, purchaseAdRemoval, purchasesRuntimeEnabled, restorePurchases } from '@/utils/purchaseService';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const language = useSettingsStore((s) => s.language);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setMusicEnabled = useSettingsStore((s) => s.setMusicEnabled);
  const setHapticEnabled = useSettingsStore((s) => s.setHapticEnabled);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const isAdFree = useProgressStore((s) => s.isAdFree);
  const [storeOwnsAdRemoval, setStoreOwnsAdRemoval] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [adRemovalPrice, setAdRemovalPrice] = useState<string | null>(null);
  const iapAvailable = purchasesRuntimeEnabled();
  const adFree = isAdFree || storeOwnsAdRemoval;

  useScreenBgm('menu');
  useFocusEffect(useCallback(() => {
    if (!iapAvailable) return;
    // 연결만 준비. 자동 restore는 Apple ID 로그인 시트를 반복해서 띄운다.
    void initPurchases();
  }, [iapAvailable]));
  useEffect(() => {
    if (!iapAvailable || adFree) return;
    let cancelled = false;
    void fetchAdRemovalProduct().then((product) => {
      if (!cancelled) setAdRemovalPrice(product?.localizedPrice ?? null);
    });
    return () => { cancelled = true; };
  }, [adFree, iapAvailable]);

  const onBack = useCallback(() => router.replace('/menu'), [router]);
  const onMusic = useCallback((value: boolean) => {
    setMusicEnabled(value);
    syncBgmWithSettings();
    if (value) playBgm('menu');
  }, [setMusicEnabled]);
  const onLanguage = useCallback((value: AppLanguage) => {
    setLanguage(value);
    changeLanguage(value);
  }, [setLanguage]);
  const buy = useCallback(async () => {
    if (purchaseBusy || adFree) return;
    setPurchaseBusy(true);
    try {
      const result = await purchaseAdRemoval();
      if (result.ok) {
        setStoreOwnsAdRemoval(true);
        if (!useProgressStore.getState().isAdFree) Alert.alert(t('menu.iapPurchaseDoneTitle'), t('menu.iapPurchaseDoneBody'));
      } else if (result.reason !== 'cancelled') Alert.alert(t('menu.iapPurchaseFailTitle'), result.message);
    } finally { setPurchaseBusy(false); }
  }, [adFree, purchaseBusy, t]);
  const restore = useCallback(async () => {
    if (purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      const restored = await restorePurchases();
      setStoreOwnsAdRemoval(restored);
      Alert.alert(restored ? t('menu.iapRestoreOkTitle') : t('menu.iapRestoreNoneTitle'), restored ? t('menu.iapRestoreOkBody') : t('menu.iapRestoreNoneBody'));
    } finally { setPurchaseBusy(false); }
  }, [purchaseBusy, t]);
  const resetProgress = useCallback(() => {
    Alert.alert(t('settings.resetTitle'), t('settings.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.resetConfirm'),
        style: 'destructive',
        onPress: () => {
          useProgressStore.getState().resetProgress();
          useMatchHistoryStore.getState().reset();
          useSettingsStore.getState().setSelectedCharacterId(1);
        },
      },
    ]);
  }, [t]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <MenuBackButton onPress={onBack} variant="overlay" />
            <View style={styles.heading}><WesternHeader title={t('menu.settings')} subtitle={t('meta.settings.subtitle')} /></View>
            <View style={styles.topbarSpacer} />
          </View>
          <WesternPanel>
            <Text style={styles.section}>{t('meta.settings.audio')}</Text>
            <WesternSettingRow label={t('menu.bgm')}><WesternToggle accessibilityLabel={t('menu.bgm')} value={musicEnabled} onValueChange={onMusic} /></WesternSettingRow>
            <WesternSettingRow label={t('menu.sfx')}><WesternToggle accessibilityLabel={t('menu.sfx')} value={soundEnabled} onValueChange={setSoundEnabled} /></WesternSettingRow>
            <WesternSettingRow label={t('menu.vibration')}><WesternToggle accessibilityLabel={t('menu.vibration')} value={hapticEnabled} onValueChange={setHapticEnabled} /></WesternSettingRow>
          </WesternPanel>
          <WesternPanel>
            <Text style={styles.section}>{t('settings.appearance')}</Text>
            <LanguageSelector value={language} onChange={onLanguage} />
            <WesternSettingRow label={t('settings.darkMode')} description={t('settings.darkModeDesc')}><WesternToggle accessibilityLabel={t('settings.darkMode')} value={darkMode} onValueChange={setDarkMode} /></WesternSettingRow>
          </WesternPanel>
          <WesternPanel>
            <Text style={styles.section}>{t('settings.game')}</Text>
            <View style={styles.iapActions}>
              <WesternButton title={t('settings.resetProgress')} variant="quiet" onPress={resetProgress} />
            </View>
          </WesternPanel>
          {iapAvailable ? <WesternPanel>
            <Text style={styles.section}>{t('menu.iapTitle')}</Text>
            <Text style={styles.copy}>{adFree ? t('menu.iapPurchasedBadge') : t('menu.iapDesc')}</Text>
            {!adFree ? <View style={styles.iapActions}><WesternButton title={purchaseBusy ? t('menu.iapBuying') : `${t('menu.iapBuy')}${adRemovalPrice ? ` · ${adRemovalPrice}` : ''}`} variant="primary" disabled={purchaseBusy} onPress={buy} accessibilityHint={t('menu.iapBuyA11y')} /><WesternButton title={t('menu.iapRestore')} variant="quiet" disabled={purchaseBusy} onPress={restore} accessibilityHint={t('menu.iapRestoreA11y')} /></View> : null}
          </WesternPanel> : null}
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  topbar: { minHeight: 76, flexDirection: 'row', alignItems: 'center' },
  heading: { flex: 1 },
  topbarSpacer: { width: 92 },
  section: { color: uiV3Colors.gold, fontFamily: FONT_WESTERN_SERIF, fontSize: 12, fontWeight: '700', letterSpacing: 1.7, marginBottom: 5, textShadowColor: '#080301', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  copy: { color: uiV3Colors.cream, fontFamily: FONT_WESTERN_SERIF, fontSize: 12, lineHeight: 20, letterSpacing: 0.2 },
  iapActions: { marginTop: 13, gap: 8 },
});
