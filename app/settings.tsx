import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { changeLanguage } from '@/locales';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore, type AppLanguage } from '@/store/settingsStore';
import { playBgm, syncBgmWithSettings } from '@/utils/bgmService';
import {
  fetchAdRemovalProduct,
  initPurchases,
  purchaseAdRemoval,
  purchasesRuntimeEnabled,
  restorePurchases,
} from '@/utils/purchaseService';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const language = useSettingsStore((s) => s.language);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setMusicEnabled = useSettingsStore((s) => s.setMusicEnabled);
  const setHapticEnabled = useSettingsStore((s) => s.setHapticEnabled);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const isAdFree = useProgressStore((s) => s.isAdFree);
  const [storeOwnsAdRemoval, setStoreOwnsAdRemoval] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [adRemovalPrice, setAdRemovalPrice] = useState<string | null>(null);
  const iapAvailable = purchasesRuntimeEnabled();
  const showPurchasedBadge = isAdFree || storeOwnsAdRemoval;

  useEffect(() => {
    if (!iapAvailable) return;
    void initPurchases();
  }, [iapAvailable]);

  useEffect(() => {
    if (!iapAvailable || isAdFree || storeOwnsAdRemoval) return;
    let cancelled = false;
    const load = async () => {
      for (let attempt = 0; attempt < 6 && !cancelled; attempt += 1) {
        const product = await fetchAdRemovalProduct();
        if (cancelled) return;
        if (product?.localizedPrice) {
          setAdRemovalPrice(product.localizedPrice);
          return;
        }
        if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [iapAvailable, isAdFree, storeOwnsAdRemoval]);

  const onLanguageChange = useCallback((lang: AppLanguage) => {
    setLanguage(lang);
    changeLanguage(lang);
  }, [setLanguage]);

  const onMusicToggle = useCallback((value: boolean) => {
    setMusicEnabled(value);
    syncBgmWithSettings();
    if (value) playBgm('menu');
  }, [setMusicEnabled]);

  const onPurchaseAdRemoval = useCallback(async () => {
    if (showPurchasedBadge || purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      const result = await purchaseAdRemoval();
      if (result.ok) {
        setStoreOwnsAdRemoval(true);
        if (!useProgressStore.getState().isAdFree) {
          Alert.alert(t('menu.iapPurchaseDoneTitle'), t('menu.iapPurchaseDoneBody'));
        }
        return;
      }
      if (result.reason === 'cancelled') return;
      Alert.alert(t('menu.iapPurchaseFailTitle'), result.message);
    } finally {
      setPurchaseBusy(false);
    }
  }, [purchaseBusy, showPurchasedBadge, t]);

  const onRestorePurchases = useCallback(async () => {
    if (purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      const restored = await restorePurchases();
      setStoreOwnsAdRemoval(restored);
      Alert.alert(
        restored ? t('menu.iapRestoreOkTitle') : t('menu.iapRestoreNoneTitle'),
        restored ? t('menu.iapRestoreOkBody') : t('menu.iapRestoreNoneBody'),
      );
    } finally {
      setPurchaseBusy(false);
    }
  }, [purchaseBusy, t]);

  return (
    <MetaScreenShell background={require('@/assets/branding/cinematic-hero.png')}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
      >
        <MenuBackButton onPress={() => router.back()} />
        <Text style={[styles.title, { fontFamily: FONT_RYE }]}>{t('menu.settings')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('menu.bgm')}</Text>
            <Switch value={musicEnabled} onValueChange={onMusicToggle} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('menu.sfx')}</Text>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('menu.vibration')}</Text>
            <Switch value={hapticEnabled} onValueChange={setHapticEnabled} />
          </View>
          <LanguageSelector value={language} onChange={onLanguageChange} />
        </View>
        {iapAvailable && !showPurchasedBadge ? (
          <View style={styles.card}>
            <Text style={styles.label}>{t('menu.iapTitle')}</Text>
            <Text style={styles.desc}>{t('menu.iapDesc')}</Text>
            <Pressable disabled={purchaseBusy} onPress={onPurchaseAdRemoval} style={styles.buy}>
              <Text style={styles.buyText}>
                {purchaseBusy ? t('menu.iapBuying') : `${t('menu.iapBuy')}${adRemovalPrice ? ` · ${adRemovalPrice}` : ''}`}
              </Text>
            </Pressable>
            <Pressable disabled={purchaseBusy} onPress={onRestorePurchases} style={styles.restore}>
              <Text style={styles.restoreText}>{t('menu.iapRestore')}</Text>
            </Pressable>
          </View>
        ) : null}
        {showPurchasedBadge ? <Text style={styles.badge}>{t('menu.iapPurchasedBadge')}</Text> : null}
      </ScrollView>
    </MetaScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, gap: 16 },
  title: { color: colors.gold, fontSize: 28, textAlign: 'center', marginTop: 8 },
  card: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.48)',
    backgroundColor: 'rgba(26, 12, 6, 0.82)',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.cream, fontSize: 16, fontWeight: '700' },
  desc: { color: colors.sand, fontSize: 13, lineHeight: 18 },
  buy: { backgroundColor: colors.ochre, paddingVertical: 12, alignItems: 'center' },
  buyText: { color: '#1A0C06', fontWeight: '800' },
  restore: { alignItems: 'center', paddingVertical: 8 },
  restoreText: { color: colors.sand, fontSize: 13 },
  badge: { color: colors.gold, textAlign: 'center', fontWeight: '700' },
});
